import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  /** Called by other services (fire-and-forget). Never throws. */
  async create(dto: CreateAuditLogDto): Promise<AuditLog> {
    const log = this.repo.create(dto);
    return this.repo.save(log);
  }

  async findAll(tenantId: string, q: QueryAuditLogDto) {
    const page  = Number(q.page  ?? 1);
    const limit = Math.min(Number(q.limit ?? 50), 200);

    const qb = this.repo.createQueryBuilder('l')
      .where('l.tenantId = :tenantId', { tenantId })
      .orderBy('l.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (q.userId)   qb.andWhere('l.userId = :userId',       { userId:   q.userId });
    if (q.userRole) qb.andWhere('l.userRole = :userRole',   { userRole: q.userRole });
    if (q.module)   qb.andWhere('l.module = :module',       { module:   q.module });
    if (q.action)   qb.andWhere('l.action = :action',       { action:   q.action });
    if (q.entityId) qb.andWhere('l.entityId = :entityId',   { entityId: q.entityId });

    if (q.from) {
      qb.andWhere('l.createdAt >= :from', { from: new Date(q.from) });
    }
    if (q.to) {
      const to = new Date(q.to);
      to.setHours(23, 59, 59, 999);
      qb.andWhere('l.createdAt <= :to', { to });
    }
    if (q.search) {
      qb.andWhere(
        '(LOWER(l.action) LIKE :s OR LOWER(l.description) LIKE :s OR LOWER(l.userName) LIKE :s)',
        { s: `%${q.search.toLowerCase()}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /** Returns the distinct modules, actions, and roles for filter dropdowns */
  async getFilterOptions(tenantId: string) {
    const [modules, actions, roles] = await Promise.all([
      this.repo.createQueryBuilder('l')
        .select('DISTINCT l.module', 'module')
        .where('l.tenantId = :tenantId', { tenantId })
        .getRawMany(),
      this.repo.createQueryBuilder('l')
        .select('DISTINCT l.action', 'action')
        .where('l.tenantId = :tenantId', { tenantId })
        .getRawMany(),
      this.repo.createQueryBuilder('l')
        .select('DISTINCT l.userRole', 'userRole')
        .where('l.tenantId = :tenantId AND l.userRole IS NOT NULL', { tenantId })
        .getRawMany(),
    ]);
    return {
      modules: modules.map(r => r.module),
      actions: actions.map(r => r.action),
      roles:   roles.map(r => r.userRole),
    };
  }
}
