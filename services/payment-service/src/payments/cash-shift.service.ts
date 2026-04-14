import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CashShift } from './cash-shift.entity';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenShiftDto {
  @IsString()  cashierName: string;
  @Type(() => Number) @IsNumber() initialCash: number;
  @IsOptional() @IsString() notes?: string;
}

export class CloseShiftDto {
  @Type(() => Number) @IsNumber() countedCash: number;
  @IsOptional() @IsString() notes?: string;
}

function dayRange() {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end   = new Date(); end.setHours(23, 59, 59, 999);
  return { start, end };
}

@Injectable()
export class CashShiftService {
  constructor(
    @InjectRepository(CashShift)
    private readonly repo: Repository<CashShift>,
  ) {}

  /** Abre un turno para un cajero — sólo puede tener uno abierto a la vez */
  async open(tenantId: string, cashierId: string, dto: OpenShiftDto): Promise<CashShift> {
    const existing = await this.repo.findOne({
      where: { tenantId, cashierId, status: 'open' },
    });
    if (existing) {
      throw new BadRequestException('Ya tienes un turno abierto. Ciérralo antes de abrir uno nuevo.');
    }
    const shift = this.repo.create({
      tenantId,
      cashierId,
      cashierName: dto.cashierName,
      initialCash: dto.initialCash,
      notes:       dto.notes ?? null,
      status:      'open',
    });
    return this.repo.save(shift);
  }

  /** Cierra el turno activo del cajero */
  async close(tenantId: string, cashierId: string, dto: CloseShiftDto): Promise<CashShift> {
    const shift = await this.repo.findOne({
      where: { tenantId, cashierId, status: 'open' },
    });
    if (!shift) throw new NotFoundException('No tienes un turno abierto.');

    const expectedCash  = Number(shift.initialCash) + Number(shift.cashSales);
    const discrepancy   = Number(dto.countedCash) - expectedCash;

    shift.countedCash  = dto.countedCash;
    shift.expectedCash = expectedCash;
    shift.discrepancy  = discrepancy;
    shift.status       = 'closed';
    shift.closedAt     = new Date();
    if (dto.notes) shift.notes = dto.notes;

    return this.repo.save(shift);
  }

  /** Obtiene el turno activo del cajero (null si no tiene) */
  getCurrent(tenantId: string, cashierId: string): Promise<CashShift | null> {
    return this.repo.findOne({ where: { tenantId, cashierId, status: 'open' } });
  }

  /** Turnos del día actual (todos los cajeros) — para admin */
  async getToday(tenantId: string): Promise<CashShift[]> {
    const { start, end } = dayRange();
    return this.repo.find({
      where: { tenantId, openedAt: Between(start, end) },
      order: { openedAt: 'ASC' },
    });
  }

  /** Resumen consolidado del día para cierre de día del admin */
  async getDailySummary(tenantId: string, date?: string) {
    const target = date ? new Date(date) : new Date();
    const start  = new Date(target); start.setHours(0, 0, 0, 0);
    const end    = new Date(target); end.setHours(23, 59, 59, 999);

    const shifts = await this.repo.find({
      where: { tenantId, openedAt: Between(start, end) },
      order: { openedAt: 'ASC' },
    });

    const hasOpen = shifts.some(s => s.status === 'open');
    const totals  = shifts.reduce(
      (acc, s) => {
        acc.cashSales      += Number(s.cashSales);
        acc.cardSales      += Number(s.cardSales);
        acc.transferSales  += Number(s.transferSales);
        acc.totalTips      += Number(s.totalTips);
        acc.totalExpected  += Number(s.expectedCash ?? 0);
        acc.totalCounted   += Number(s.countedCash  ?? 0);
        acc.totalDiscrepancy += Number(s.discrepancy ?? 0);
        return acc;
      },
      { cashSales: 0, cardSales: 0, transferSales: 0, totalTips: 0,
        totalExpected: 0, totalCounted: 0, totalDiscrepancy: 0 },
    );

    return { date: target.toISOString().split('T')[0], hasOpen, shifts, totals };
  }

  /** Llamado internamente al procesar un pago — suma al turno activo */
  async addPayment(
    tenantId: string, cashierId: string,
    method: string, amount: number, tip: number,
  ) {
    const shift = await this.repo.findOne({
      where: { tenantId, cashierId, status: 'open' },
    });
    if (!shift) return; // no hay turno abierto — no bloqueamos el pago

    if (method === 'cash')     shift.cashSales     = Number(shift.cashSales)     + amount;
    else if (method === 'card') shift.cardSales     = Number(shift.cardSales)     + amount;
    else                        shift.transferSales = Number(shift.transferSales) + amount;

    shift.totalTips = Number(shift.totalTips) + tip;
    await this.repo.save(shift);
  }
}
