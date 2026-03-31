import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, InventoryMovement, MovementType } from './inventory.entity';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustInventoryDto {
  @IsString() productId: string;
  @IsString() productName: string;
  @Type(() => Number) @IsNumber() quantity: number;
  @IsEnum(MovementType) type: MovementType;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsString() userId?: string;
}

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory) private readonly repo: Repository<Inventory>,
    @InjectRepository(InventoryMovement) private readonly movRepo: Repository<InventoryMovement>,
  ) {}

  findAll(tenantId: string) { return this.repo.find({ where: { tenantId }, order: { productName: 'ASC' } }); }

  findOne(tenantId: string, productId: string) { return this.repo.findOne({ where: { tenantId, productId } }); }

  async adjust(tenantId: string, dto: AdjustInventoryDto) {
    let inv = await this.repo.findOne({ where: { tenantId, productId: dto.productId } });
    const prev = inv?.quantity ?? 0;
    if (!inv) inv = this.repo.create({ tenantId, productId: dto.productId, productName: dto.productName, quantity: 0 });
    if (dto.type === MovementType.IN || dto.type === MovementType.ADJUSTMENT)
      inv.quantity = Number(inv.quantity) + Number(dto.quantity);
    else inv.quantity = Math.max(0, Number(inv.quantity) - Number(dto.quantity));
    await this.repo.save(inv);
    await this.movRepo.save(this.movRepo.create({ tenantId, productId: dto.productId, type: dto.type, quantity: dto.quantity, previousQuantity: prev, reason: dto.reason, userId: dto.userId }));
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
}
