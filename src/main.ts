import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const server = app.getHttpAdapter().getInstance();

  app.setGlobalPrefix('api');
  server.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
  server.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Lectura Aumentada API')
    .setDescription(
      'API REST para la plataforma Lectura Aumentada: autenticación, unidades de aprendizaje, progreso y activos AR.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
  SwaggerModule.setup('api/api-docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
