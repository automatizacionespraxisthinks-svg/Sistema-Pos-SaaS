import { Controller, Get, Post, Put, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
@ApiTags('Users') @ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly svc: UsersService) {}
  @Post('tenants') createTenant(@Body() dto: any) { return this.svc.createTenant(dto); }
  @Get('tenants/:id') getTenant(@Param('id') id: string) { return this.svc.getTenant(id); }
  @Put('tenants/:id') updateTenant(@Param('id') id: string, @Body() dto: any) { return this.svc.updateTenant(id, dto); }
  @Get('tenants/:id/settings') getSettings(@Param('id') id: string) { return this.svc.getSettings(id); }
  @Put('tenants/:id/settings') updateSettings(@Param('id') id: string, @Body() dto: any) { return this.svc.updateSettings(id, dto); }
  @Get('health') health() { return { status: 'ok' }; }
}
