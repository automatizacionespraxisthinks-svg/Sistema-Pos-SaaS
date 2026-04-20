import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProductStatus } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty() @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) price: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsBoolean() trackInventory?: boolean;
  @IsOptional() @IsArray() variants?: any[];
  @IsOptional() @IsArray() modifiers?: any[];
  @IsOptional() @Type(() => Number) @IsNumber() preparationTime?: number;
}

export class UpdateProductDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) price?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) costPrice?: number;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() barcode?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @IsBoolean() trackInventory?: boolean;
  @IsOptional() @IsArray() variants?: any[];
  @IsOptional() @IsArray() modifiers?: any[];
  @IsOptional() @Type(() => Number) @IsNumber() preparationTime?: number;
}

export class ProductFilterDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsEnum(ProductStatus) status?: ProductStatus;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
}
