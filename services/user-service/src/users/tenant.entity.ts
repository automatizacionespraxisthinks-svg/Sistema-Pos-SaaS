import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum PlanType { STARTER='starter', PRO='pro', ENTERPRISE='enterprise' }
@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() name: string;
  @Column({ nullable: true }) businessType: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) logoUrl: string;
  @Column({ type: 'enum', enum: PlanType, default: PlanType.STARTER }) plan: PlanType;
  @Column({ default: true }) isActive: boolean;
  @Column({ nullable: true }) taxId: string;
  @Column({ type: 'jsonb', nullable: true }) settings: any;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
