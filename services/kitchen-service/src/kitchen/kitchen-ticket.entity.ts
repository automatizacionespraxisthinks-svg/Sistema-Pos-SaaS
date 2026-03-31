import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum TicketStatus { PENDING='pending', IN_PROGRESS='in_progress', READY='ready', CANCELLED='cancelled' }
@Entity('kitchen_tickets')
export class KitchenTicket {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() orderId: string;
  @Column() orderNumber: string;
  @Column({ nullable: true }) tableNumber: string;
  @Column({ type: 'jsonb' }) items: any[];
  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.PENDING }) status: TicketStatus;
  @Column({ nullable: true }) assignedTo: string;
  @Column({ nullable: true, type: 'text' }) notes: string;
  @Column({ nullable: true }) startedAt: Date;
  @Column({ nullable: true }) completedAt: Date;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
