import { Controller, Get, Post, Patch, Put, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, OrderFilterDto, UpdateOrderItemsDto } from './dto/order.dto';

@ApiTags('Orders') @ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Post()
  create(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: CreateOrderDto,
  ) { return this.svc.create(tid, dto, uid, rol); }

  @Get()
  findAll(@Headers('x-tenant-id') tid: string, @Query() f: OrderFilterDto) { return this.svc.findAll(tid, f); }

  @Get('active')
  getActive(@Headers('x-tenant-id') tid: string) { return this.svc.getActive(tid); }

  @Get(':id')
  findOne(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }

  @Patch(':id/status')
  updateStatus(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) { return this.svc.updateStatus(tid, id, dto, uid, rol); }

  @Put(':id/items')
  updateItems(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
    @Body() dto: UpdateOrderItemsDto,
  ) { return this.svc.updateItems(tid, id, dto, uid, rol); }

  @Get('health')
  health() { return { status: 'ok' }; }
}
