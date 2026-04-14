import { Controller, Get, Post, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, AdjustInventoryDto, UpsertRecipeDto, DeductOrderDto } from './inventory.service';

@ApiTags('Inventory') @ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly svc: InventoryService) {}

  @Get()
  findAll(@Headers('x-tenant-id') tid: string) { return this.svc.findAll(tid); }

  @Get('low-stock')
  getLowStock(@Headers('x-tenant-id') tid: string) { return this.svc.getLowStock(tid); }

  @Get('movements')
  getMovements(@Headers('x-tenant-id') tid: string, @Query('productId') pid?: string) {
    return this.svc.getMovements(tid, pid);
  }

  @Post('adjust')
  adjust(
    @Headers('x-tenant-id') tid: string,
    @Headers('x-user-id')   uid: string,
    @Headers('x-user-role') rol: string,
    @Body() dto: AdjustInventoryDto,
  ) { return this.svc.adjust(tid, dto, uid, rol); }

  // ── Recetas ────────────────────────────────────────────────────────────────

  @Get('recipes')
  getRecipes(@Headers('x-tenant-id') tid: string) {
    return this.svc.getRecipes(tid);
  }

  @Post('recipes')
  upsertRecipe(
    @Headers('x-tenant-id') tid: string,
    @Body() dto: UpsertRecipeDto,
  ) {
    return this.svc.upsertRecipe(tid, dto);
  }

  @Delete('recipes/:productId')
  deleteRecipe(
    @Headers('x-tenant-id') tid: string,
    @Param('productId') productId: string,
  ) {
    return this.svc.deleteRecipe(tid, productId);
  }

  /** Llamado internamente por order-service al marcar pedido como pagado */
  @Post('deduct-order')
  deductByOrder(
    @Headers('x-tenant-id') tid: string,
    @Body() dto: DeductOrderDto,
  ) {
    const tenantId = tid || dto.tenantId;
    return this.svc.deductByOrder(tenantId, dto.items);
  }

  @Get(':productId')
  findOne(@Headers('x-tenant-id') tid: string, @Param('productId') pid: string) {
    return this.svc.findOne(tid, pid);
  }

  @Get('health')
  health() { return { status: 'ok' }; }
}
