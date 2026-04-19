import { Controller, Get, Post, Patch, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { KitchenService, CreateTicketDto } from './kitchen.service';
import { TicketStatus } from './kitchen-ticket.entity';
@ApiTags('Kitchen') @ApiBearerAuth()
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly svc: KitchenService) {}
  @Post('tickets') create(@Headers('x-tenant-id') tid: string, @Body() dto: CreateTicketDto) { return this.svc.create(tid, dto); }
  @Get('tickets') getActive(@Headers('x-tenant-id') tid: string) { return this.svc.getActive(tid); }
  @Get('tickets/history') getHistory(@Headers('x-tenant-id') tid: string) { return this.svc.getHistory(tid); }
  @Patch('tickets/:id/status') updateStatus(@Headers('x-tenant-id') tid: string, @Param('id') id: string, @Body() b: { status: TicketStatus; assignedTo?: string }) { return this.svc.updateStatus(tid, id, b.status, b.assignedTo); }
  /** Usado por order-service para sincronizar el ticket cuando un pedido llega a estado terminal */
  @Patch('tickets/by-order/:orderId/status') updateByOrder(@Headers('x-tenant-id') tid: string, @Param('orderId') orderId: string, @Body() b: { status: TicketStatus }) { return this.svc.updateStatusByOrderId(tid, orderId, b.status); }
  @Get('health') health() { return { status: 'ok' }; }
}
