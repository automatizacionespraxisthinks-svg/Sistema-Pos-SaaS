import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}
  create(tenantId: string, dto: CreateCategoryDto) { return this.repo.save(this.repo.create({ ...dto, tenantId })); }
  findAll(tenantId: string) { return this.repo.find({ where: { tenantId, isActive: true }, order: { sortOrder: 'ASC', name: 'ASC' } }); }
  async findOne(tenantId: string, id: string) {
    const c = await this.repo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Category not found');
    return c;
  }
  async update(tenantId: string, id: string, dto: Partial<CreateCategoryDto>) {
    const c = await this.findOne(tenantId, id);
    return this.repo.save(Object.assign(c, dto));
  }
  async remove(tenantId: string, id: string) {
    const c = await this.findOne(tenantId, id);
    await this.repo.remove(c);
  }
}
