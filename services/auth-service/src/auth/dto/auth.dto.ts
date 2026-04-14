import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsBoolean, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class LoginDto {
  @ApiProperty({ example: 'mi-restaurante' }) @IsString() slug: string;
  @ApiProperty({ example: 'admin@demo.com' }) @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Mi Restaurante' }) @IsString() businessName: string;
  @ApiProperty({ example: 'mi-restaurante', description: 'Solo minúsculas, números y guiones' })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'El código solo puede tener minúsculas, números y guiones' })
  slug: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}

export class RefreshTokenDto { @ApiProperty() @IsString() refreshToken: string; }

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateUserDto {
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
}

export class UpdateTenantDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() primaryColor?: string;
  @IsOptional() @IsString() taxId?: string;
}
