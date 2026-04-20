import { Controller, Get, Post, Patch, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { TablesService, CreateTableDto, UpdateTableDto, SaveLayoutDto } from './tables.service';

@ApiTags('Tables') @ApiBearerAuth()
@Controller('tables')
export class TablesController {
  constructor(private readonly svc: TablesService) {}

  @Get()
  findAll(@Headers('x-tenant-id') tid: string) {
    return this.svc.findAll(tid);
  }

  @Post()
  create(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: CreateTableDto,
  ) { return this.svc.create(tid, dto, uid, rol); }

  @Patch('layout')
  saveLayout(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() body: SaveLayoutDto,
  ) { return this.svc.saveLayout(tid, body.positions, uid, rol); }

  @Patch(':id')
  update(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) { return this.svc.update(tid, id, dto, uid, rol); }

  @Delete(':id')
  remove(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Param('id') id: string,
  ) { return this.svc.remove(tid, id, uid, rol); }

  @Get('health')
  health() { return { status: 'ok' }; }
}
