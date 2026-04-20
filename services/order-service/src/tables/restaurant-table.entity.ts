import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('restaurant_tables')
export class RestaurantTable {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() tenantId: string;

  /** Identificador visible: "Mesa 1", "Barra 2", etc. — único por tenant */
  @Column() name: string;

  /** mesa | barra | terraza | otro */
  @Column({ default: 'mesa' }) type: string;

  /** Personas que caben */
  @Column({ default: 4 }) capacity: number;

  /** Zona: interior | terraza | barra | etc (libre) */
  @Column({ nullable: true, type: 'text' }) zone: string;

  // ── Posición en el plano ──────────────────────────────────────────────────
  @Column({ type: 'float', default: 60 }) posX: number;
  @Column({ type: 'float', default: 60 }) posY: number;
  @Column({ type: 'float', default: 120 }) width: number;
  @Column({ type: 'float', default: 90 }) height: number;

  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
