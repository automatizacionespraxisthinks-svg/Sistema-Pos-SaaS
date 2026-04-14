import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum AuditAction {
  // Auth
  LOGIN            = 'LOGIN',
  CREATE_USER      = 'CREATE_USER',
  UPDATE_USER      = 'UPDATE_USER',
  DEACTIVATE_USER  = 'DEACTIVATE_USER',
  UPDATE_TENANT    = 'UPDATE_TENANT',
  // Orders
  CREATE_ORDER     = 'CREATE_ORDER',
  UPDATE_ORDER_STATUS = 'UPDATE_ORDER_STATUS',
  UPDATE_ORDER_ITEMS  = 'UPDATE_ORDER_ITEMS',
  CANCEL_ORDER     = 'CANCEL_ORDER',
  // Products
  CREATE_PRODUCT   = 'CREATE_PRODUCT',
  UPDATE_PRODUCT   = 'UPDATE_PRODUCT',
  DELETE_PRODUCT   = 'DELETE_PRODUCT',
  CREATE_CATEGORY  = 'CREATE_CATEGORY',
  UPDATE_CATEGORY  = 'UPDATE_CATEGORY',
  DELETE_CATEGORY  = 'DELETE_CATEGORY',
  // Payments
  PROCESS_PAYMENT  = 'PROCESS_PAYMENT',
  OPEN_SHIFT       = 'OPEN_SHIFT',
  CLOSE_SHIFT      = 'CLOSE_SHIFT',
  // Inventory
  ADJUST_INVENTORY = 'ADJUST_INVENTORY',
}

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'action'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tenantId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ nullable: true })
  userRole: string;

  @Column()
  module: string;

  @Column()
  action: string;

  @Column({ nullable: true })
  entityId: string;

  @Column({ nullable: true })
  entityType: string;

  @Column({ type: 'jsonb', nullable: true })
  previousValue: any;

  @Column({ type: 'jsonb', nullable: true })
  newValue: any;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @CreateDateColumn()
  createdAt: Date;
}
