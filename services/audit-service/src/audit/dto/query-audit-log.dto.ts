import { IsOptional, IsString, IsNumberString } from 'class-validator';

export class QueryAuditLogDto {
  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  userRole?: string;

  @IsOptional() @IsString()
  module?: string;

  @IsOptional() @IsString()
  action?: string;

  @IsOptional() @IsString()
  entityId?: string;

  /** ISO date string — from */
  @IsOptional() @IsString()
  from?: string;

  /** ISO date string — to */
  @IsOptional() @IsString()
  to?: string;

  /** Free-text search over description / action */
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsNumberString()
  page?: number;

  @IsOptional() @IsNumberString()
  limit?: number;
}
