import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
export enum ProductStatus { ACTIVE='active', INACTIVE='inactive', OUT_OF_STOCK='out_of_stock' }
@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;
  @Column() name: string;
  @Column({ nullable: true, type: 'text' }) description: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) price: number;
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) costPrice: number;
  @Column({ nullable: true }) sku: string;
  @Column({ nullable: true }) barcode: string;
  @Column({ nullable: true }) imageUrl: string;
  @Column({ nullable: true }) categoryId: string;
  @ManyToOne(() => Category, { nullable: true, eager: true })
  @JoinColumn({ name: 'categoryId' }) category: Category;
  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE }) status: ProductStatus;
  @Column({ default: true }) trackInventory: boolean;
  @Column({ default: false }) isCombo: boolean;
  @Column({ type: 'jsonb', nullable: true }) variants: any[];
  @Column({ type: 'jsonb', nullable: true }) modifiers: any[];
  @Column({ type: 'int', default: 0 }) preparationTime: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
