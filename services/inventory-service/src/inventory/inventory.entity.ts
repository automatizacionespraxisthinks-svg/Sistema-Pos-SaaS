import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum MovementType { IN='in', OUT='out', ADJUSTMENT='adjustment', WASTE='waste' }
@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() productId: string;
  @Column() productName: string;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 }) minStock: number;
  @Column({ nullable: true }) unit: string;
  @Column({ nullable: true }) location: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
@Entity('inventory_movements')
export class InventoryMovement {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() productId: string;
  @Column({ type: 'enum', enum: MovementType }) type: MovementType;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) quantity: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) previousQuantity: number;
  @Column({ nullable: true }) reason: string;
  @Column({ nullable: true }) userId: string;
  @CreateDateColumn() createdAt: Date;
}
