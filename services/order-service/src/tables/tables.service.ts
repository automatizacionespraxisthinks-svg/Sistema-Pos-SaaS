import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { RestaurantTable } from './restaurant-table.entity';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { auditLog } from '../orders/audit-client';

export class CreateTableDto {
  @IsString()                    name: string;
  @IsOptional() @IsString()      type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50) capacity?: number;
  @IsOptional() @IsString()      zone?: string;
  @IsOptional() @Type(() => Number) @IsNumber() posX?: number;
  @IsOptional() @Type(() => Number) @IsNumber() posY?: number;
}

export class UpdateTableDto {
  @IsOptional() @IsString()      name?: string;
  @IsOptional() @IsString()      type?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50) capacity?: number;
  @IsOptional() @IsString()      zone?: string;
}

export class LayoutPositionDto {
  @IsString()                                          id: string;
  @Type(() => Number) @IsNumber()                      posX: number;
  @Type(() => Number) @IsNumber()                      posY: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) width?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) height?: number;
}

export class SaveLayoutDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => LayoutPositionDto)
  positions: LayoutPositionDto[];
}

export interface LayoutPosition {
  id: string;
  posX: number;
  posY: number;
  width?: number;
  height?: number;
}

@Injectable()
export class TablesService {
  constructor(
    @InjectRepository(RestaurantTable) private readonly repo: Repository<RestaurantTable>,
    @InjectRepository(Order)           private readonly orderRepo: Repository<Order>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({
      where: { tenantId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async create(tenantId: string, dto: CreateTableDto, actorId?: string, actorRole?: string) {
    const exists = await this.repo.findOne({ where: { tenantId, name: dto.name } });
    if (exists) throw new ConflictException(`Ya existe una ubicación con el nombre "${dto.name}"`);

    const table = this.repo.create({ ...dto, tenantId });
    const saved = await this.repo.save(table);

    auditLog({
      tenantId, userId: actorId, userRole: actorRole,
      module: 'tables', action: 'CREATE_TABLE',
      entityId: saved.id, entityType: 'RestaurantTable',
      newValue: { name: saved.name, type: saved.type, capacity: saved.capacity, zone: saved.zone },
      description: `Ubicación creada: ${saved.name} (${saved.type}, cap. ${saved.capacity})`,
    });
    return saved;
  }

  async update(tenantId: string, id: string, dto: UpdateTableDto, actorId?: string, actorRole?: string) {
    const table = await this.repo.findOne({ where: { id, tenantId } });
    if (!table) throw new NotFoundException('Ubicación no encontrada');

    if (dto.name && dto.name !== table.name) {
      const exists = await this.repo.findOne({ where: { tenantId, name: dto.name } });
      if (exists) throw new ConflictException(`Ya existe una ubicación con el nombre "${dto.name}"`);
    }

    const prev = { name: table.name, type: table.type, capacity: table.capacity };
    Object.assign(table, dto);
    const saved = await this.repo.save(table);

    auditLog({
      tenantId, userId: actorId, userRole: actorRole,
      module: 'tables', action: 'UPDATE_TABLE',
      entityId: saved.id, entityType: 'RestaurantTable',
      previousValue: prev, newValue: dto,
      description: `Ubicación actualizada: ${saved.name}`,
    });
    return saved;
  }

  async remove(tenantId: string, id: string, actorId?: string, actorRole?: string) {
    const table = await this.repo.findOne({ where: { id, tenantId } });
    if (!table) throw new NotFoundException('Ubicación no encontrada');

    // No eliminar si tiene pedido activo
    const OPEN = [
      OrderStatus.PENDING, OrderStatus.CONFIRMED,
      OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERED,
    ];
    const active = await this.orderRepo.findOne({
      where: OPEN.map(s => ({ tenantId, tableNumber: table.name, status: s })),
    });
    if (active) {
      throw new BadRequestException(
        `"${table.name}" tiene un pedido activo (${active.orderNumber}). Cierra la cuenta antes de eliminarla`,
      );
    }

    await this.repo.remove(table);

    auditLog({
      tenantId, userId: actorId, userRole: actorRole,
      module: 'tables', action: 'DELETE_TABLE',
      entityId: id, entityType: 'RestaurantTable',
      previousValue: { name: table.name, type: table.type, capacity: table.capacity },
      description: `Ubicación eliminada: ${table.name}`,
    });
    return { deleted: true, name: table.name };
  }

  async saveLayout(tenantId: string, positions: LayoutPosition[], actorId?: string, actorRole?: string) {
    for (const p of positions) {
      await this.repo.update(
        { id: p.id, tenantId },
        {
          posX: p.posX, posY: p.posY,
          ...(p.width  != null ? { width:  p.width  } : {}),
          ...(p.height != null ? { height: p.height } : {}),
        },
      );
    }

    auditLog({
      tenantId, userId: actorId, userRole: actorRole,
      module: 'tables', action: 'UPDATE_LAYOUT',
      entityId: '', entityType: 'RestaurantTable',
      newValue: { positions: positions.length },
      description: `Distribución del plano actualizada (${positions.length} ubicaciones)`,
    });
    return { saved: positions.length };
  }
}
