import { Controller, Get, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  // ── legacy endpoints (kept for backward compat) ─────────────────────────────

  @Get('dashboard')
  getDashboard(@Headers('x-tenant-id') tid: string, @Query('date') date?: string) {
    return this.svc.getDashboard(tid, date);
  }

  @Get('sales')
  getSales(@Headers('x-tenant-id') tid: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getSalesReport(tid, from, to);
  }

  // ── new analytics endpoints ──────────────────────────────────────────────────

  @Get('overview')
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'date',   description: 'YYYY-MM-DD reference date', required: false })
  getOverview(
    @Headers('x-tenant-id') tid: string,
    @Query('period') period?: string,
    @Query('date')   date?: string,
  ) {
    return this.svc.getOverview(tid, period || 'day', date);
  }

  @Get('revenue-trend')
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'date',   required: false })
  getRevenueTrend(
    @Headers('x-tenant-id') tid: string,
    @Query('period') period?: string,
    @Query('date')   date?: string,
  ) {
    return this.svc.getRevenueTrend(tid, period || 'day', date);
  }

  @Get('top-products')
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'date',   required: false })
  getTopProducts(
    @Headers('x-tenant-id') tid: string,
    @Query('period') period?: string,
    @Query('date')   date?: string,
  ) {
    return this.svc.getTopProducts(tid, period || 'month', date);
  }

  @Get('payment-methods')
  @ApiQuery({ name: 'period', enum: ['day', 'week', 'month'], required: false })
  @ApiQuery({ name: 'date',   required: false })
  getPaymentMethods(
    @Headers('x-tenant-id') tid: string,
    @Query('period') period?: string,
    @Query('date')   date?: string,
  ) {
    return this.svc.getPaymentMethods(tid, period || 'day', date);
  }

  @Get('hourly')
  @ApiQuery({ name: 'date', description: 'YYYY-MM-DD', required: false })
  getHourly(@Headers('x-tenant-id') tid: string, @Query('date') date?: string) {
    return this.svc.getHourlyChart(tid, date);
  }

  @Get('health')
  health() { return { status: 'ok' }; }
}
