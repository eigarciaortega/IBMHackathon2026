import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: '*' });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('OfficeSpace — Catalog Service')
    .setDescription(
      '## API de Gestión de Espacios y Autenticación\n\n' +
      'Gestiona espacios físicos (Salas y Escritorios) y emite tokens JWT para toda la plataforma.\n\n' +
      '### 🔐 Persistencia del Token JWT\n\n' +
      '1. Ejecuta `POST /auth/login` con tus credenciales.\n' +
      '2. El response incluye `access_token` — un JWT firmado con expiración de **8 horas**.\n' +
      '3. El frontend almacena el token en `localStorage` y lo adjunta automáticamente\n' +
      '   en el header `Authorization: Bearer <token>` de cada petición.\n' +
      '4. El **mismo token** es válido para el Booking Service (puerto 3012) —\n' +
      '   ambos servicios comparten el mismo `JWT_SECRET`.\n' +
      '5. Al expirar el token, el servidor responde `401 Unauthorized` y\n' +
      '   el frontend limpia la sesión y redirige al login automáticamente.\n\n' +
      '### 🔑 Cómo autenticarte en Swagger\n\n' +
      '1. Ejecuta `POST /auth/login` con las credenciales de prueba.\n' +
      '2. Copia el valor de `access_token` del response.\n' +
      '3. Haz clic en el botón **Authorize 🔒** (arriba a la derecha).\n' +
      '4. Pega el token en el campo **Value** y confirma.\n' +
      '5. Todos los endpoints quedan autenticados en esta sesión de Swagger.\n\n' +
      '### 👥 Roles\n' +
      '- `ADMINISTRADOR` — CRUD completo de espacios y mantenimiento.\n' +
      '- `COLABORADOR` — Solo lectura de espacios. Gestión de sus propias reservas en el Booking Service.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT obtenido de POST /auth/login. Válido 8 horas. ' +
          'Pega aquí el valor de access_token sin el prefijo "Bearer".',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`\n🏢  Catalog Service corriendo en: http://localhost:${port}`);
  console.log(`📋  Swagger UI:                   http://localhost:${port}/api-docs\n`);
}
bootstrap();
