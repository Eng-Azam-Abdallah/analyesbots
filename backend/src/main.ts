import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const corsOrigins = (
    config.get<string>('CORS_ORIGINS') ??
    'http://localhost:3000,http://158.247.227.80:3017,http://158.247.227.80:3080'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);
}
bootstrap();
