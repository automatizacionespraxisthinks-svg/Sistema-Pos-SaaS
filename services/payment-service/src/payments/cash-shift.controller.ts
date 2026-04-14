import { Controller, Post, Get, Body, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CashShiftService, OpenShiftDto, CloseShiftDto, AddMovementDto } from './cash-shift.service';

@ApiTags('CashShifts') @ApiBearerAuth()
@Controller('cash-shifts')
export class CashShiftController {
  constructor(private readonly svc: CashShiftService) {}

  /** Abrir turno */
  @Post('open')
  open(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Body() dto: OpenShiftDto,
  ) {
    return this.svc.open(tid, uid, dto);
  }

  /** Cerrar turno */
  @Post('close')
  close(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Body() dto: CloseShiftDto,
  ) {
    return this.svc.close(tid, uid, dto);
  }

  /** Obtener turno activo del cajero actual */
  @Get('current')
  getCurrent(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    return this.svc.getCurrent(tid, uid);
  }

  /** Registrar un movimiento manual (ingreso/egreso) en el turno activo */
  @Post('movements')
  addMovement(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Body() dto: AddMovementDto,
  ) {
    return this.svc.addMovement(tid, uid, dto);
  }

  /** Obtener movimientos del turno activo del cajero */
  @Get('movements')
  getMovements(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
  ) {
    return this.svc.getMovements(tid, uid);
  }

  /** Turnos de hoy — todos los cajeros (admin) */
  @Get('today')
  getToday(@Headers('x-tenant-id') tid: string) {
    return this.svc.getToday(tid);
  }

  /** Resumen consolidado del día (admin) */
  @Get('summary')
  getSummary(
    @Headers('x-tenant-id') tid: string,
    @Query('date') date?: string,
  ) {
    return this.svc.getDailySummary(tid, date);
  }

  @Get('health')
  health() { return { status: 'ok' }; }
}
