import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: '*' });
  const port = process.env.PORT || 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`Notification Service on port ${port}`);
}
bootstrap();
