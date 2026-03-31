import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
export enum UserRole { SUPER_ADMIN='super_admin', ADMIN='admin', CASHIER='cashier', WAITER='waiter', KITCHEN='kitchen', VIEWER='viewer' }
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) email: string;
  @Column() password: string;
  @Column() firstName: string;
  @Column() lastName: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.CASHIER }) role: UserRole;
  @Column({ nullable: true }) tenantId: string;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}