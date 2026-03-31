import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './users/tenant.entity';
import { UsersController } from './users/users.controller';
import { UsersService } from './users/users.service';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cfg: ConfigService) => ({ type: 'postgres', url: cfg.get('DATABASE_URL'), entities: [Tenant], synchronize: true }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Tenant]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class AppModule {}
