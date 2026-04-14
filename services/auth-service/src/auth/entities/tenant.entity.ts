import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) slug: string;
  @Column() name: string;
  @Column({ nullable: true }) phone: string;
  @Column({ nullable: true }) address: string;
  @Column({ nullable: true }) logoUrl: string;
  @Column({ nullable: true }) primaryColor: string;
  @Column({ nullable: true }) taxId: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
