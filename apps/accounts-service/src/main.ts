import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('AccountsService');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('NeoWallet — Accounts Service')
    .setDescription(
      'API de gestión de cuentas y saldos. Maneja usuarios y actualizaciones de balance con bloqueo pesimista para consistencia de datos.',
    )
    .setVersion('1.0')
    .addTag('Accounts')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  logger.log(`Accounts Service corriendo en http://localhost:${port}`);
  logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
