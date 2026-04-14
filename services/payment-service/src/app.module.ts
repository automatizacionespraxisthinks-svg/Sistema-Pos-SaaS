import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payments/payment.entity';
import { CashShift } from './payments/cash-shift.entity';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { CashShiftController } from './payments/cash-shift.controller';
import { CashShiftService } from './payments/cash-shift.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        entities: [Payment, CashShift],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Payment, CashShift]),
  ],
  controllers: [PaymentsController, CashShiftController],
  providers: [PaymentsService, CashShiftService],
})
export class AppModule {}
