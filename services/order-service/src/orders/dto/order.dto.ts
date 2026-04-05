import { IsString, IsEnum, IsOptional, IsArray, IsNumber, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { OrderType, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @IsUUID() productId: string;
  @IsString() productName: string;
  @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
  @Type(() => Number) @IsNumber() @Min(1) quantity: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() modifiers?: any[];
}

export class CreateOrderDto {
  @IsEnum(OrderType) type: OrderType;
  @IsOptional() @IsString() tableNumber?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() waiterId?: string;
  @IsOptional() @IsString() waiterName?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
  @IsOptional() @IsString() reason?: string;
}

export class OrderFilterDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(OrderType) type?: OrderType;
  @IsOptional() @IsString() tableNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}

export class UpdateOrderItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreateOrderItemDto) items: CreateOrderItemDto[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
}
