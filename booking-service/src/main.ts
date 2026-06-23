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
    .setTitle('OfficeSpace — Booking Service')
    .setDescription(
      '## Motor de Reservas — Anti-solapamiento, Check-in y Mantenimiento\n\n' +
      'Gestiona el ciclo completo de una reserva: creación, check-in, cancelación y reasignación.\n\n' +
      '### 🔐 Autenticación — Token compartido con Catalog Service\n\n' +
      'Este servicio **no emite tokens**. Utiliza el mismo JWT emitido por el Catalog Service (puerto 3011).\n' +
      'Ambos servicios comparten el mismo `JWT_SECRET`, por lo que el token es válido en los dos sin\n' +
      'ninguna llamada entre servicios (arquitectura stateless).\n\n' +
      '**Para obtener el token:**\n' +
      '1. Ve a `http://localhost:3011/api-docs`\n' +
      '2. Ejecuta `POST /auth/login` con tus credenciales.\n' +
      '3. Copia `access_token` del response.\n' +
      '4. Regresa aquí, haz clic en **Authorize 🔒** y pega el token.\n\n' +
      '### ⏱️ Ciclo de vida del token\n\n' +
      '| Evento | Comportamiento |\n' +
      '|---|---|\n' +
      '| Login exitoso | Token JWT firmado, expira en **8 horas** |\n' +
      '| Cada petición | Frontend adjunta `Authorization: Bearer <token>` automáticamente |\n' +
      '| Token expirado | Servidor responde `401` → frontend limpia sesión y redirige al login |\n' +
      '| Logout manual | Token eliminado de `localStorage`, sesión destruida localmente |\n\n' +
      '### 👥 Control de acceso por rol\n' +
      '- `COLABORADOR` — crear/cancelar sus propias reservas, check-in, ver sugerencias.\n' +
      '- `ADMINISTRADOR` — todas las operaciones anteriores + ver todas las reservas,\n' +
      '  cancelar cualquier reserva, reasignar reservas afectadas por mantenimiento.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Token JWT obtenido de POST /auth/login en el Catalog Service (http://localhost:3011/api-docs). ' +
          'Válido 8 horas. Pega aquí el valor de access_token sin el prefijo "Bearer".',
      },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`\n📅  Booking Service corriendo en: http://localhost:${port}`);
  console.log(`📋  Swagger UI:                  http://localhost:${port}/api-docs\n`);
}
bootstrap();
