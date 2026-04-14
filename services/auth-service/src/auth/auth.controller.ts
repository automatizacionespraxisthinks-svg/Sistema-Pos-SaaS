import { Controller, Post, Get, Patch, Delete, Body, Param, Headers, Query, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, UpdateUserDto, CreateUserDto, UpdateTenantDto } from './dto/auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}

  // ── Public ────────────────────────────────────────────────────────────────
  @Post('register')
  register(
    @Headers('x-registration-secret') secret: string,
    @Body() dto: RegisterDto,
  ) {
    const expected = process.env.REGISTRATION_SECRET;
    if (expected && secret !== expected) {
      throw new UnauthorizedException('Se requiere el código de registro de administrador');
    }
    return this.svc.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) { return this.svc.login(dto); }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) { return this.svc.refresh(dto.refreshToken); }

  @Post('logout')
  logout(@Headers('x-user-id') uid: string) { return this.svc.logout(uid); }

  @Post('validate')
  validate(@Body() b: { token: string }) { return this.svc.validateToken(b.token); }

  @Get('health')
  health() { return { status: 'ok', service: 'auth-service' }; }

  @Get('tenant/public/:slug')
  getTenantPublic(@Param('slug') slug: string) { return this.svc.getTenantPublic(slug); }

  // ── Tenant (requires auth) ────────────────────────────────────────────────
  @Get('tenant')
  getTenant(@Headers('x-tenant-id') tid: string) { return this.svc.getTenant(tid); }

  @Patch('tenant')
  updateTenant(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: UpdateTenantDto,
  ) { return this.svc.updateTenant(tid, dto, uid, rol); }

  // ── Users (requires auth) ─────────────────────────────────────────────────
  @Post('users')
  createUser(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: CreateUserDto,
  ) { return this.svc.createUser(tid, dto, uid, rol); }

  @Get('users')
  @ApiQuery({ name: 'role', required: false })
  getUsers(
    @Headers('x-tenant-id') tid: string,
    @Query('role') role?: string,
  ) { return this.svc.getUsersByRole(tid, role); }

  @Patch('users/:id')
  updateUser(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) { return this.svc.updateUser(tid, id, dto, uid, rol); }

  @Delete('users/:id')
  deleteUser(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
  ) { return this.svc.deleteUser(tid, id, uid, rol); }
}
