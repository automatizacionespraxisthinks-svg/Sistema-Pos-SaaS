import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';
import { auditLog } from './audit-client';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  async create(tenantId: string, dto: CreateProductDto, actorId?: string, actorRole?: string) {
    const saved = await this.repo.save(this.repo.create({ ...dto, tenantId }));

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'products',
      action:   'CREATE_PRODUCT',
      entityId: saved.id,
      entityType: 'Product',
      newValue: { name: saved.name, sku: saved.sku, price: saved.price, categoryId: saved.categoryId },
      description: `Producto creado: ${saved.name} (${saved.sku}) — $${saved.price}`,
    });

    return saved;
  }

  async findAll(tenantId: string, filters: ProductFilterDto) {
    const { categoryId, status, page = 1, limit = 50 } = filters;
    const where: any = { tenantId };
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    const [data, total] = await this.repo.findAndCount({
      where, order: { name: 'ASC' },
      skip: (page - 1) * limit, take: limit,
    });
    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const p = await this.repo.findOne({ where: { id, tenantId } });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto, actorId?: string, actorRole?: string) {
    const p = await this.findOne(tenantId, id);
    const prev = { name: p.name, price: p.price, status: p.status, sku: p.sku };
    const saved = await this.repo.save(Object.assign(p, dto));

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'products',
      action:   'UPDATE_PRODUCT',
      entityId: saved.id,
      entityType: 'Product',
      previousValue: prev,
      newValue: { name: saved.name, price: saved.price, status: saved.status, sku: saved.sku },
      description: `Producto actualizado: ${saved.name}`,
    });

    return saved;
  }

  async remove(tenantId: string, id: string, actorId?: string, actorRole?: string) {
    const p = await this.findOne(tenantId, id);
    const snapshot = { name: p.name, sku: p.sku, price: p.price };

    auditLog({
      tenantId,
      userId:   actorId,
      userRole: actorRole,
      module:   'products',
      action:   'DELETE_PRODUCT',
      entityId: id,
      entityType: 'Product',
      previousValue: snapshot,
      description: `Producto eliminado: ${p.name} (${p.sku})`,
    });

    await this.repo.remove(p);
  }
}
