import { Controller, Get, Post, Put, Delete, Body, Param, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './categories.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly svc: CategoriesService) {}
  @Post() create(@Headers('x-tenant-id') tid: string, @Body() dto: CreateCategoryDto) { return this.svc.create(tid, dto); }
  @Get() findAll(@Headers('x-tenant-id') tid: string) { return this.svc.findAll(tid); }
  @Get(':id') findOne(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@Headers('x-tenant-id') tid: string, @Param('id') id: string, @Body() dto: CreateCategoryDto) { return this.svc.update(tid, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
}
