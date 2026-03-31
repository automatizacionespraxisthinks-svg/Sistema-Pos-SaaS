import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';
export enum OrderStatus { PENDING='pending', CONFIRMED='confirmed', PREPARING='preparing', READY='ready', DELIVERED='delivered', PAID='paid', CANCELLED='cancelled' }
export enum OrderType { DINE_IN='dine_in', TAKEOUT='takeout', DELIVERY='delivery', ONLINE='online' }
export enum PaymentStatus { PENDING='pending', PAID='paid', PARTIAL='partial', REFUNDED='refunded' }
@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() orderNumber: string;
  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.PENDING }) status: OrderStatus;
  @Column({ type: 'enum', enum: OrderType, default: OrderType.DINE_IN }) type: OrderType;
  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING }) paymentStatus: PaymentStatus;
  @Column({ nullable: true }) tableNumber: string;
  @Column({ nullable: true }) customerId: string;
  @Column({ nullable: true }) waiterId: string;
  @Column({ nullable: true }) waiterName: string;
  @OneToMany(() => OrderItem, i => i.order, { cascade: true, eager: true }) items: OrderItem[];
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) subtotal: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) tax: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) discount: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) total: number;
  @Column({ nullable: true, type: 'text' }) notes: string;
  @Column({ nullable: true }) cancelReason: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
