import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as http from 'http';
import { Order, OrderStatus, OrderType, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto, UpdateOrderStatusDto, OrderFilterDto, UpdateOrderItemsDto } from './dto/order.dto';
import { auditLog } from './audit-client';

/** Fire-and-forget: descuenta inventario al pagar un pedido */
function deductInventory(tenantId: string, items: { productId: string; productName: string; quantity: number }[]) {
  const inventoryUrl = process.env.INVENTORY_SERVICE_URL || 'http://localhost:3004';
  const body = JSON.stringify({ tenantId, items });
  try {
    const parsed = new URL(`${inventoryUrl}/inventory/deduct-order`);
    const req = http.request({
      hostname: parsed.hostname,
      port:     Number(parsed.port) || 80,
      path:     parsed.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-tenant-id':    tenantId,
      },
    }, (res) => { res.resume(); });
    req.on('error', () => {});
    req.setTimeout(3000, () => { req.destroy(); });
    req.write(body);
    req.end();
  } catch { /* silent */ }
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo: Repository<OrderItem>,
  ) {}

  async create(tenantId: string, dto: CreateOrderDto, actorId?: string, actorRole?: string) {
    const count = await this.orderRepo.count({ where: { tenantId } });
    const orderNumber = `ORD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${String(count+1).padStart(4,'0')}`;
    const subtotal = dto.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    const tax = subtotal * 0.19;
    const discount = dto.discount || 0;
    const total = subtotal + tax - discount;
    const order = this.orderRepo.create({
      tenantId, orderNumber, type: dto.type,
      tableNumber: dto.tableNumber, customerId: dto.customerId,
      waiterId: dto.waiterId, waiterName: dto.waiterName, notes: dto.notes,
      subtotal, tax, discount, total,
      items: dto.items.map(i => this.itemRepo.create({ ...i, subtotal: i.unitPrice * i.quantity })),
    });
    const saved = await this.orderRepo.save(order);

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'orders',
      action:   'CREATE_ORDER',
      entityId: saved.id,
      entityType: 'Order',
      newValue: { orderNumber: saved.orderNumber, type: saved.type, tableNumber: saved.tableNumber, total: saved.total, itemCount: dto.items.length },
      description: `Pedido creado: ${saved.orderNumber} — Mesa ${saved.tableNumber || '-'} — Total $${saved.total}`,
    });

    return saved;
  }

  async findAll(tenantId: string, filters: OrderFilterDto) {
    const { status, type, tableNumber, page = 1, limit = 50 } = filters;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .where('o.tenantId = :tenantId', { tenantId })
      .orderBy('o.createdAt', 'DESC');
    if (status) qb.andWhere('o.status = :status', { status });
    if (type) qb.andWhere('o.type = :type', { type });
    if (tableNumber) qb.andWhere('o.tableNumber = :tableNumber', { tableNumber });
    qb.skip((page - 1) * limit).take(limit);
    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const o = await this.orderRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!o) throw new NotFoundException('Order not found');
    return o;
  }

  async getActive(tenantId: string) {
    return this.orderRepo.find({
      where: [
        { tenantId, status: OrderStatus.PENDING },
        { tenantId, status: OrderStatus.CONFIRMED },
        { tenantId, status: OrderStatus.PREPARING },
        { tenantId, status: OrderStatus.READY },
      ],
      relations: ['items'], order: { createdAt: 'ASC' },
    });
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateOrderStatusDto, actorId?: string, actorRole?: string) {
    const order = await this.findOne(tenantId, id);
    const allowed: Record<OrderStatus, OrderStatus[]> = {
      [OrderStatus.PENDING]:   [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
      [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
      [OrderStatus.PREPARING]: [OrderStatus.READY, OrderStatus.CANCELLED],
      [OrderStatus.READY]:     [OrderStatus.DELIVERED, OrderStatus.PAID, OrderStatus.CANCELLED],
      [OrderStatus.DELIVERED]: [OrderStatus.PAID],
      [OrderStatus.PAID]:      [],
      [OrderStatus.CANCELLED]: [],
    };
    if (!allowed[order.status]?.includes(dto.status))
      throw new BadRequestException(`Cannot transition from ${order.status} to ${dto.status}`);

    // Solo cajeros (o admin) pueden marcar como pagado
    if (dto.status === OrderStatus.PAID) {
      const cashierRoles = ['cashier', 'admin', 'super_admin'];
      if (actorRole && !cashierRoles.includes(actorRole)) {
        throw new ForbiddenException('Solo los cajeros pueden registrar el pago de un pedido');
      }
    }

    const prevStatus = order.status;
    order.status = dto.status;
    if (dto.status === OrderStatus.CANCELLED) order.cancelReason = dto.reason;
    if (dto.status === OrderStatus.PAID) order.paymentStatus = PaymentStatus.PAID;
    const saved = await this.orderRepo.save(order);

    // Auto-deducir inventario al pagar (fire-and-forget)
    if (dto.status === OrderStatus.PAID && saved.items?.length) {
      deductInventory(tenantId, saved.items.map(i => ({
        productId:   i.productId,
        productName: i.productName,
        quantity:    i.quantity,
      })));
    }

    const action = dto.status === OrderStatus.CANCELLED ? 'CANCEL_ORDER' : 'UPDATE_ORDER_STATUS';
    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'orders',
      action,
      entityId: saved.id,
      entityType: 'Order',
      previousValue: { status: prevStatus },
      newValue:      { status: dto.status, reason: dto.reason },
      description: `Pedido ${order.orderNumber}: ${prevStatus} → ${dto.status}${dto.reason ? ` (${dto.reason})` : ''}`,
    });

    return saved;
  }

  async updateItems(tenantId: string, id: string, dto: UpdateOrderItemsDto, actorId?: string, actorRole?: string) {
    const order = await this.orderRepo.findOne({ where: { id, tenantId }, relations: ['items'] });
    if (!order) throw new NotFoundException('Order not found');
    if (!['pending', 'confirmed'].includes(order.status))
      throw new BadRequestException('Solo se pueden editar pedidos pendientes o confirmados');

    const prevTotal     = order.total;
    const prevItemCount = order.items?.length ?? 0;

    const subtotal = dto.items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
    const tax      = Math.round(subtotal * 0.19);
    const discount = Number(dto.discount ?? order.discount) || 0;
    const total    = subtotal + tax - discount;

    if (order.items?.length) await this.itemRepo.remove(order.items);

    const newItems = dto.items.map(i =>
      this.itemRepo.create({ ...i, subtotal: i.unitPrice * i.quantity }),
    );
    order.items    = await this.itemRepo.save(newItems);
    order.subtotal = subtotal;
    order.tax      = tax;
    order.discount = discount;
    order.total    = total;

    const saved = await this.orderRepo.save(order);

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'orders',
      action:   'UPDATE_ORDER_ITEMS',
      entityId: saved.id,
      entityType: 'Order',
      previousValue: { total: prevTotal, itemCount: prevItemCount },
      newValue:      { total: saved.total, itemCount: dto.items.length },
      description: `Items del pedido ${order.orderNumber} actualizados — Nuevo total: $${saved.total}`,
    });

    return saved;
  }
}
