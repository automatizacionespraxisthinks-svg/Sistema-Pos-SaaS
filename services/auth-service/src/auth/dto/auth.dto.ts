import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';
export class LoginDto {
  @ApiProperty({ example: 'admin@demo.com' }) @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
}
export class RegisterDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() @MinLength(6) password: string;
  @ApiProperty() @IsString() firstName: string;
  @ApiProperty() @IsString() lastName: string;
  @ApiProperty({ enum: UserRole, default: UserRole.CASHIER }) @IsEnum(UserRole) @IsOptional() role?: UserRole;
  @ApiProperty({ required: false }) @IsString() @IsOptional() tenantId?: string;
}
export class RefreshTokenDto { @ApiProperty() @IsString() refreshToken: string; }

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() isActive?: boolean;
}