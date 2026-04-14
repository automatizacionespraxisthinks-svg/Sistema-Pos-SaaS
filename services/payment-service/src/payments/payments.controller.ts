import { Controller, Post, Get, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService, ProcessPaymentDto } from './payments.service';

@ApiTags('Payments') @ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly svc: PaymentsService) {}

  @Post()
  process(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: ProcessPaymentDto,
  ) { return this.svc.process(tid, dto, uid, rol); }

  @Get('order/:orderId')
  findByOrder(
    @Headers('x-tenant-id') tid: string,
    @Param('orderId') oid: string,
  ) { return this.svc.findByOrder(tid, oid); }

  @Get('summary/daily')
  getDailySummary(
    @Headers('x-tenant-id') tid: string,
    @Query('date') date?: string,
  ) { return this.svc.getDailySummary(tid, date); }

  /** Propinas del día para el mesero autenticado */
  @Get('tips/my')
  getMyTips(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) { return this.svc.getWaiterTips(tid, uid); }

  @Get('health') health() { return { status: 'ok' }; }
}
