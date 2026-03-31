import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  create(tenantId: string, dto: CreateProductDto) {
    return this.repo.save(this.repo.create({ ...dto, tenantId }));
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

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const p = await this.findOne(tenantId, id);
    return this.repo.save(Object.assign(p, dto));
  }

  async remove(tenantId: string, id: string) {
    const p = await this.findOne(tenantId, id);
    await this.repo.remove(p);
  }
}
