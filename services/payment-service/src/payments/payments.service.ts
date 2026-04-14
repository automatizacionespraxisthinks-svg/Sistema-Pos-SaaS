import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { CashShiftService } from './cash-shift.service';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessPaymentDto {
  @IsString() orderId: string;
  @Type(() => Number) @IsNumber() amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @Type(() => Number) @IsNumber() tip?: number;
  @IsOptional() @Type(() => Number) @IsNumber() cashReceived?: number;
  @IsOptional() @IsString() cashierId?: string;
  @IsOptional() @IsString() cashierName?: string;
  /** Mesero que atendió la mesa */
  @IsOptional() @IsString() waiterId?: string;
  @IsOptional() @IsString() waiterName?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly repo: Repository<Payment>,
    private readonly shiftSvc: CashShiftService,
  ) {}

  async process(tenantId: string, dto: ProcessPaymentDto) {
    const tipAmount = Number(dto.tip ?? 0);
    const change = dto.method === PaymentMethod.CASH && dto.cashReceived
      ? dto.cashReceived - (dto.amount + tipAmount)
      : 0;

    const payment = this.repo.create({
      tenantId, ...dto,
      tip:      tipAmount,
      change,
      status:   PaymentStatus.COMPLETED,
      reference: `PAY-${Date.now()}`,
    });
    const saved = await this.repo.save(payment);

    // Actualizar turno activo del cajero (best-effort)
    if (dto.cashierId) {
      await this.shiftSvc.addPayment(
        tenantId, dto.cashierId, dto.method, dto.amount, tipAmount,
      ).catch(() => {});
    }

    return saved;
  }

  findByOrder(tenantId: string, orderId: string) {
    return this.repo.find({ where: { tenantId, orderId }, order: { createdAt: 'DESC' } });
  }

  async getDailySummary(tenantId: string, date?: string) {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end   = new Date(target); end.setHours(23, 59, 59, 999);
    return this.repo.createQueryBuilder('p')
      .select('p.method', 'method')
      .addSelect('SUM(p.amount)', 'total')
      .addSelect('SUM(p.tip)',    'totalTips')
      .addSelect('COUNT(p.id)',   'count')
      .where(
        'p.tenantId = :tenantId AND p.createdAt BETWEEN :start AND :end AND p.status = :s',
        { tenantId, start, end, s: PaymentStatus.COMPLETED },
      )
      .groupBy('p.method')
      .getRawMany();
  }

  /** Propinas del mesero en el día (para vista del mesero) */
  async getWaiterTips(tenantId: string, waiterId: string) {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    const rows = await this.repo.createQueryBuilder('p')
      .select('SUM(p.tip)', 'totalTips')
      .addSelect('COUNT(p.id)', 'count')
      .where(
        'p.tenantId = :tenantId AND p.waiterId = :waiterId AND p.createdAt BETWEEN :start AND :end AND p.status = :s AND p.tip > 0',
        { tenantId, waiterId, start, end, s: PaymentStatus.COMPLETED },
      )
      .getRawOne();
    return {
      totalTips: Number(rows?.totalTips ?? 0),
      count:     Number(rows?.count     ?? 0),
    };
  }
}
