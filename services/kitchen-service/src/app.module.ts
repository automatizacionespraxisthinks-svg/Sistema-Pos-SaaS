import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenTicket } from './kitchen/kitchen-ticket.entity';
import { KitchenController } from './kitchen/kitchen.controller';
import { KitchenService } from './kitchen/kitchen.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({ type: 'postgres', url: cfg.get('DATABASE_URL'), entities: [KitchenTicket], synchronize: true }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([KitchenTicket]),
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class AppModule {}
