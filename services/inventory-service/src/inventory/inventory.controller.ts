import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, AdjustInventoryDto } from './inventory.service';
@ApiTags('Inventory') @ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}
  @Get() findAll(@Headers('x-tenant-id') tid: string) { return this.svc.findAll(tid); }
  @Get('low-stock') getLowStock(@Headers('x-tenant-id') tid: string) { return this.svc.getLowStock(tid); }
  @Get('movements') getMovements(@Headers('x-tenant-id') tid: string, @Query('productId') pid?: string) { return this.svc.getMovements(tid, pid); }
  @Get(':productId') findOne(@Headers('x-tenant-id') tid: string, @Param('productId') pid: string) { return this.svc.findOne(tid, pid); }
  @Post('adjust') adjust(@Headers('x-tenant-id') tid: string, @Body() dto: AdjustInventoryDto) { return this.svc.adjust(tid, dto); }
  @Get('health') health() { return { status: 'ok' }; }
}
