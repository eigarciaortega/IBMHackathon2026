import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from '../../backend/src/common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? '*', credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('OfficeSpace · catalog-service')
    .setDescription('Espacios, Recursos y Bot FAQ — v1')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api-docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.CATALOG_SERVICE_PORT ?? 3002);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`catalog-service en http://localhost:${port}/api/v1 (docs: /api-docs)`);
}
void bootstrap();
