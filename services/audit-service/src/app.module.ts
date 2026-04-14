import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit/audit-log.entity';
import { AuditController } from './audit/audit.controller';
import { AuditService } from './audit/audit.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        url: cfg.get('DATABASE_URL'),
        entities: [AuditLog],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([AuditLog]),
  ],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AppModule {}
