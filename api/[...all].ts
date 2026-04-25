import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';

type Handler = (req: Request, res: Response) => void;

let cachedHandler: Handler | null = null;

async function createHandler(): Promise<Handler> {
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
  SwaggerModule.setup('api-docs', app, document, {
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  return app.getHttpAdapter().getInstance() as Handler;
}

export default async function handler(req: Request, res: Response): Promise<void> {
  if (!cachedHandler) {
    cachedHandler = await createHandler();
  }
  cachedHandler(req, res);
}
