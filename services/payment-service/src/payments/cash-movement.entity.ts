import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() tenantId: string;
  @Column() shiftId: string;
  @Column() cashierId: string;
  @Column() cashierName: string;

  /** 'income' = ingreso  |  'expense' = egreso */
  @Column() type: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 }) amount: number;

  @Column({ type: 'text' }) reason: string;

  @CreateDateColumn() createdAt: Date;
}
