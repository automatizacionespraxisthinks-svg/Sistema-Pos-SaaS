import { Controller, Get, Post, Put, Delete, Body, Param, Query, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto, ProductFilterDto } from './dto/product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}
  @Post() create(@Headers('x-tenant-id') tid: string, @Body() dto: CreateProductDto) { return this.svc.create(tid, dto); }
  @Get() findAll(@Headers('x-tenant-id') tid: string, @Query() filters: ProductFilterDto) { return this.svc.findAll(tid, filters); }
  @Get(':id') findOne(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.findOne(tid, id); }
  @Put(':id') update(@Headers('x-tenant-id') tid: string, @Param('id') id: string, @Body() dto: UpdateProductDto) { return this.svc.update(tid, id, dto); }
  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) remove(@Headers('x-tenant-id') tid: string, @Param('id') id: string) { return this.svc.remove(tid, id); }
  @Get('health') health() { return { status: 'ok' }; }
}
