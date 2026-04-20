import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantTable } from './restaurant-table.entity';
import { Order } from '../orders/entities/order.entity';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [TypeOrmModule.forFeature([RestaurantTable, Order])],
  controllers: [TablesController],
  providers: [TablesService],
})
export class TablesModule {}
