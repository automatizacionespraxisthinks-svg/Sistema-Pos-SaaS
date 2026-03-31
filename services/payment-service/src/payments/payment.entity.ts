import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
export enum PaymentMethod { CASH='cash', CARD='card', TRANSFER='transfer', MIXED='mixed' }
export enum PaymentStatus { PENDING='pending', COMPLETED='completed', FAILED='failed', REFUNDED='refunded' }
@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() orderId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) amount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) tip: number;
  @Column({ type: 'enum', enum: PaymentMethod }) method: PaymentMethod;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.COMPLETED }) status: PaymentStatus;
  @Column({ nullable: true }) reference: string;
  @Column({ nullable: true }) cashierId: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) cashReceived: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) change: number;
  @Column({ nullable: true, type: 'text' }) notes: string;
  @CreateDateColumn() createdAt: Date;
}
