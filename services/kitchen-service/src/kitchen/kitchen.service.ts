import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KitchenTicket, TicketStatus } from './kitchen-ticket.entity';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class CreateTicketDto {
  @IsString() orderId: string;
  @IsString() orderNumber: string;
  @IsOptional() @IsString() tableNumber?: string;
  @IsArray() items: any[];
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
export class KitchenService {
  constructor(@InjectRepository(KitchenTicket) private readonly repo: Repository<KitchenTicket>) {}

  create(tenantId: string, dto: CreateTicketDto) {
    return this.repo.save(this.repo.create({ ...dto, tenantId }));
  }

  getActive(tenantId: string) {
    return this.repo.find({
      where: [{ tenantId, status: TicketStatus.PENDING }, { tenantId, status: TicketStatus.IN_PROGRESS }],
      order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(tenantId: string, id: string, status: TicketStatus, assignedTo?: string) {
    const t = await this.repo.findOne({ where: { id, tenantId } });
    if (!t) return null;
    t.status = status;
    if (assignedTo) t.assignedTo = assignedTo;
    if (status === TicketStatus.IN_PROGRESS) t.startedAt = new Date();
    if (status === TicketStatus.READY) t.completedAt = new Date();
    return this.repo.save(t);
  }

  /** Sincroniza el estado del ticket usando el orderId en lugar del ticket id.
   *  Solo actúa si el ticket sigue activo (PENDING o IN_PROGRESS);
   *  si ya está READY o CANCELLED, lo ignora silenciosamente. */
  async updateStatusByOrderId(tenantId: string, orderId: string, status: TicketStatus) {
    const t = await this.repo.findOne({ where: { orderId, tenantId } });
    if (!t) return null;
    if (t.status === TicketStatus.READY || t.status === TicketStatus.CANCELLED) return t;
    t.status = status;
    if (status === TicketStatus.IN_PROGRESS && !t.startedAt) t.startedAt = new Date();
    if (status === TicketStatus.READY) t.completedAt = new Date();
    return this.repo.save(t);
  }

  getHistory(tenantId: string) {
    return this.repo.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 50 });
  }
}
