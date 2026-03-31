import { Controller, Get, Post, Patch, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderFilterDto } from './dto/order.dto';
@ApiTags('Orders') @ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}
  @Post() create(@Headers('x-tenant-id') tid: string, @Body() dto: CreateOrderDto) { return this.svc.create(tid, dto); }
  @Get() findAll(@Headers('x-tenant-id') tid: string, @Query() f: OrderFilterDto) { return this.svc.findAll(tid, f); }
  @Get('active') getActive(@Headers('x-tenant-id') tid: string) { return this.svc.getActive(tid); }
  @Get(':id') findOne(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Patch(':id/status') updateStatus(@Headers('x-tenant-id') tid: string, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto) { return this.svc.updateStatus(tid, id, dto); }
  @Get('health') health() { return { status: 'ok' }; }
}
