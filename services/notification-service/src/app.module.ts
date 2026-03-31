import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [NotificationsGateway],
})
export class AppModule {}
