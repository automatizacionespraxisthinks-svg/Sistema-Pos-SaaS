import { Controller, Post, Patch, Delete, Body, Param, Headers, Get, Query } from '@nestjs/common';
import { ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, RefreshTokenDto, UpdateUserDto } from './dto/auth.dto';
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

  @Post('users')
  createUser(
    @Headers('x-tenant-id') tid: string,
    @Body() dto: RegisterDto,
  ) {
    return this.svc.createUser(tid, dto);
  }

  @Get('users')
  @ApiQuery({ name: 'role', required: false, description: 'Filtrar por rol: waiter, cashier, kitchen, admin, viewer' })
  getUsers(
    @Headers('x-tenant-id') tid: string,
    @Query('role') role?: string,
  ) {
    return this.svc.getUsersByRole(tid, role);
  }

  @Patch('users/:id')
  updateUser(
    @Headers('x-tenant-id') tid: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.svc.updateUser(tid, id, dto);
  }

  @Delete('users/:id')
  deleteUser(
    @Headers('x-tenant-id') tid: string,
    @Param('id') id: string,
  ) {
    return this.svc.deleteUser(tid, id);
  }
}
