import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('ProcessorService');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('NeoWallet — Processor Service')
    .setDescription(
      'API de procesamiento de transferencias P2P. Implementa el Patrón Saga para garantizar consistencia de datos distribuida: nunca se pierde ni se crea dinero.',
    )
    .setVersion('1.0')
    .addTag('Processor')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`Processor Service corriendo en http://localhost:${port}`);
  logger.log(`Swagger UI disponible en http://localhost:${port}/api/docs`);
}

bootstrap();
