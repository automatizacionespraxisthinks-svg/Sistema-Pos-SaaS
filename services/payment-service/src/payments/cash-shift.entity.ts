import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

@Entity('cash_shifts')
export class CashShift {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column() tenantId: string;
  @Column() cashierId: string;
  @Column() cashierName: string;

  /** Fondo inicial entregado al cajero */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  initialCash: number;

  /** Ventas acumuladas por método (se actualiza en cada pago) */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cashSales: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  cardSales: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  transferSales: number;
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalTips: number;

  /** Cierre: efectivo contado físicamente por el cajero */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  countedCash: number;

  /** Efectivo esperado = initialCash + cashSales */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  expectedCash: number;

  /** Diferencia = countedCash - expectedCash */
  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  discrepancy: number;

  @Column({ default: 'open' }) status: string; // 'open' | 'closed'

  @Column({ nullable: true, type: 'text' }) notes: string;

  @CreateDateColumn() openedAt: Date;
  @Column({ type: 'timestamp', nullable: true }) closedAt: Date;

  @UpdateDateColumn() updatedAt: Date;
}
