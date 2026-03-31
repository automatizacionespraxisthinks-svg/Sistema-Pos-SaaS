import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentMethod, PaymentStatus } from './payment.entity';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class ProcessPaymentDto {
  @IsString() orderId: string;
  @Type(() => Number) @IsNumber() amount: number;
  @IsEnum(PaymentMethod) method: PaymentMethod;
  @IsOptional() @Type(() => Number) @IsNumber() tip?: number;
  @IsOptional() @Type(() => Number) @IsNumber() cashReceived?: number;
  @IsOptional() @IsString() cashierId?: string;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class PaymentsService {
  constructor(@InjectRepository(Payment) private readonly repo: Repository<Payment>) {}

  async process(tenantId: string, dto: ProcessPaymentDto) {
    const tipAmount = Number(dto.tip ?? 0);
    // El cambio considera el total del pedido + la propina
    const change = dto.method === PaymentMethod.CASH && dto.cashReceived
      ? dto.cashReceived - (dto.amount + tipAmount)
      : 0;
    const payment = this.repo.create({
      tenantId, ...dto,
      tip: tipAmount,
      change,
      status: PaymentStatus.COMPLETED,
      reference: `PAY-${Date.now()}`,
    });
    return this.repo.save(payment);
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
}
