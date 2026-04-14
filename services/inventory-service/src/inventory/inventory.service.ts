import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, InventoryMovement, MovementType } from './inventory.entity';
import { Recipe, RecipeIngredient } from './recipe.entity';
import { auditLog } from './audit-client';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustInventoryDto {
  @IsString() productId: string;
  @IsString() productName: string;
  @Type(() => Number) @IsNumber() quantity: number;
  @IsEnum(MovementType) type: MovementType;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() userId?: string;
}

export class UpsertRecipeDto {
  @IsString() productId:   string;
  @IsString() productName: string;
  @IsArray()  ingredients: RecipeIngredient[];
}

export class DeductOrderItemDto {
  @IsString() productId:   string;
  @IsString() productName: string;
  @Type(() => Number) @IsNumber() quantity: number;
}

export class DeductOrderDto {
  @IsOptional() @IsString() tenantId?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => DeductOrderItemDto)
  items: DeductOrderItemDto[];
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)        private readonly repo:       Repository<Inventory>,
    @InjectRepository(InventoryMovement) private readonly movRepo:   Repository<InventoryMovement>,
    @InjectRepository(Recipe)           private readonly recipeRepo: Repository<Recipe>,
  ) {}

  findAll(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { productName: 'ASC' } }); }

  findOne(tenantId: string, productId: string) { return this.repo.findOne({ where: { tenantId, productId } }); }

  async adjust(tenantId: string, dto: AdjustInventoryDto, actorId?: string, actorRole?: string) {
    let inv = await this.repo.findOne({ where: { tenantId, productId: dto.productId } });
    const prev = inv?.quantity ?? 0;
    if (!inv) inv = this.repo.create({ tenantId, productId: dto.productId, productName: dto.productName, quantity: 0 });
    if (dto.type === MovementType.IN || dto.type === MovementType.ADJUSTMENT)
      inv.quantity = Number(inv.quantity) + Number(dto.quantity);
    else inv.quantity = Math.max(0, Number(inv.quantity) - Number(dto.quantity));
    await this.repo.save(inv);
    await this.movRepo.save(this.movRepo.create({
      tenantId,
      productId: dto.productId,
      type: dto.type,
      quantity: dto.quantity,
      previousQuantity: prev,
      reason: dto.reason,
      userId: dto.userId,
    }));

    auditLog({
      tenantId,
      userId:   actorId || dto.userId,
      userRole: actorRole,
      module:   'inventory',
      action:   'ADJUST_INVENTORY',
      entityId: dto.productId,
      entityType: 'Inventory',
      previousValue: { productName: dto.productName, quantity: prev },
      newValue:      { productName: dto.productName, quantity: inv.quantity, movementType: dto.type, delta: dto.quantity },
      description: `Inventario ajustado: ${dto.productName} — ${prev} → ${inv.quantity} (${dto.type})${dto.reason ? ` — ${dto.reason}` : ''}`,
    });

    return inv;
  }

  getLowStock(tenantId: string) {
    return this.repo.createQueryBuilder('i')
      .where('i.tenantId = :tenantId AND i.quantity <= i.minStock', { tenantId })
      .getMany();
  }

  getMovements(tenantId: string, productId?: string) {
    const where: any = { tenantId };
    if (productId) where.productId = productId;
    return this.movRepo.find({ where, order: { createdAt: 'DESC' }, take: 100 });
  }

  // ── Recetas ──────────────────────────────────────────────────────────────────

  getRecipes(tenantId: string) {
    return this.recipeRepo.find({ where: { tenantId }, order: { productName: 'ASC' } });
  }

  async upsertRecipe(tenantId: string, dto: UpsertRecipeDto): Promise<Recipe> {
    let recipe = await this.recipeRepo.findOne({ where: { tenantId, productId: dto.productId } });
    if (!recipe) recipe = this.recipeRepo.create({ tenantId, productId: dto.productId });
    recipe.productName  = dto.productName;
    recipe.ingredients  = dto.ingredients;
    return this.recipeRepo.save(recipe);
  }

  async deleteRecipe(tenantId: string, productId: string): Promise<void> {
    const recipe = await this.recipeRepo.findOne({ where: { tenantId, productId } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    await this.recipeRepo.remove(recipe);
  }

  /** Auto-descuenta inventario al pagar un pedido — fire-and-forget seguro */
  async deductByOrder(tenantId: string, items: DeductOrderItemDto[]): Promise<void> {
    for (const item of items) {
      const recipe = await this.recipeRepo.findOne({ where: { tenantId, productId: item.productId } });
      if (!recipe || !recipe.ingredients?.length) continue;

      for (const ing of recipe.ingredients) {
        const totalQty = ing.quantity * item.quantity;
        await this.adjust(tenantId, {
          productId:   ing.ingredientId,
          productName: ing.ingredientName,
          quantity:    totalQty,
          type:        MovementType.OUT,
          reason:      `Auto-deducción: ${item.productName} ×${item.quantity}`,
        });
      }
    }
  }
}
