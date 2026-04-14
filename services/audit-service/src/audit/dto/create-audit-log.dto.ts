import { IsString, IsOptional, IsObject } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  tenantId: string;

  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  userName?: string;

  @IsOptional() @IsString()
  userRole?: string;

  @IsString()
  module: string;

  @IsString()
  action: string;

  @IsOptional() @IsString()
  entityId?: string;

  @IsOptional() @IsString()
  entityType?: string;

  @IsOptional()
  previousValue?: any;

  @IsOptional()
  newValue?: any;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  ipAddress?: string;
}
