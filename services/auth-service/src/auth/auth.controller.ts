import { Controller, Post, Body, Headers, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto } from './dto/auth.dto';
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly svc: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.svc.register(dto); }
  @Post('login') login(@Body() dto: LoginDto) { return this.svc.login(dto); }
  @Post('refresh') refresh(@Body() dto: RefreshTokenDto) { return this.svc.refresh(dto.refreshToken); }
  @Post('logout') logout(@Headers('x-user-id') uid: string) { return this.svc.logout(uid); }
  @Post('validate') validate(@Body() b: { token: string }) { return this.svc.validateToken(b.token); }
  @Get('health') health() { return { status: 'ok', service: 'auth-service' }; }

  @Get('users')
  @ApiQuery({ name: 'role', required: false, description: 'Filtrar por rol: waiter, cashier, kitchen, admin, viewer' })
  getUsers(
    @Headers('x-tenant-id') tid: string,
    @Query('role') role?: string,
  ) {
    return this.svc.getUsersByRole(tid, role);
  }
}
