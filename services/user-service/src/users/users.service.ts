import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
@Injectable()
export class UsersService {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}
  createTenant(dto: Partial<Tenant>) { return this.repo.save(this.repo.create(dto)); }
  async getTenant(id: string) {
    const t = await this.repo.findOne({ where: { id } });
    if (!t) throw new NotFoundException('Tenant not found');
    return t;
  }
  async updateTenant(id: string, dto: Partial<Tenant>) {
    const t = await this.getTenant(id);
    return this.repo.save(Object.assign(t, dto));
  }
  async getSettings(id: string) { return (await this.getTenant(id)).settings || {}; }
  async updateSettings(id: string, settings: any) {
    const t = await this.getTenant(id);
    t.settings = { ...(t.settings || {}), ...settings };
    return this.repo.save(t);
  }
}
