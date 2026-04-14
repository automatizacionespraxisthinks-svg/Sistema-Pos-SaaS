import { Controller, Get, Post, Body, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@ApiTags('Audit')
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly svc: AuditService) {}

  /**
   * Internal endpoint — called by other microservices (fire-and-forget).
   * No auth required here; protection is at network level (Docker internal network).
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateAuditLogDto) {
    return this.svc.create(dto);
  }

  /**
   * Admin-facing endpoint — requires valid JWT (gateway validates tenantId).
   * Only admin roles should be able to reach this via the gateway.
   */
  @Get()
  @ApiBearerAuth()
  findAll(
    @Headers('x-tenant-id') tid: string,
    @Query() q: QueryAuditLogDto,
  ) {
    return this.svc.findAll(tid, q);
  }

  /** Returns distinct filter options (modules, actions, roles) */
  @Get('filters')
  @ApiBearerAuth()
  getFilterOptions(@Headers('x-tenant-id') tid: string) {
    return this.svc.getFilterOptions(tid);
  }

  @Get('health')
  health() { return { status: 'ok', service: 'audit-service' }; }
}
