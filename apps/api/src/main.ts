import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation: unknown properties are stripped (`whitelist`) and
  // requests with them are rejected outright (`forbidNonWhitelisted`)
  // rather than silently dropped, and incoming plain JSON is coerced into
  // the DTO's declared types before validation runs. Per
  // docs/architecture/security.md: "unknown properties stripped... on the
  // global validation pipe."
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
