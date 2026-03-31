import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() orderId: string;
  @ManyToOne(() => Order, o => o.items, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'orderId' }) order: Order;
  @Column() productId: string;
  @Column() productName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) unitPrice: number;
  @Column({ type: 'int', default: 1 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) subtotal: number;
  @Column({ nullable: true, type: 'text' }) notes: string;
  @Column({ type: 'jsonb', nullable: true }) modifiers: any[];
  @Column({ default: false }) isVoided: boolean;
}
