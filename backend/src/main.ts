import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);
}
bootstrap();
