import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inventory, InventoryMovement } from './inventory/inventory.entity';
import { Recipe } from './inventory/recipe.entity';
import { InventoryController } from './inventory/inventory.controller';
import { InventoryService } from './inventory/inventory.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        entities: [Inventory, InventoryMovement, Recipe],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Inventory, InventoryMovement, Recipe]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class AppModule {}
