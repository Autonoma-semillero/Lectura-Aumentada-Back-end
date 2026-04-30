import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { mkdirSync } from 'fs';
import { Request, Response } from 'express';
import { static as expressStatic } from 'express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join, resolve } from 'path';
import { AppModule } from './app.module';

type ExpressLikeHandler = (req: Request, res: Response) => void;

let cachedApp: INestApplication | null = null;

function configureCors(app: INestApplication): void {
  const raw = process.env.CORS_ORIGINS?.trim();
  const origins =
    raw && raw.length > 0
      ? raw
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : null;
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (origins && origins.length > 0) {
    app.enableCors({ origin: origins, credentials: true });
  } else if (nodeEnv === 'development') {
    app.enableCors({ origin: true, credentials: true });
  } else {
    app.enableCors({ origin: false, credentials: false });
  }
}

async function configureApp(app: INestApplication): Promise<void> {
  const server = app.getHttpAdapter().getInstance();
  const uploadsRoot = resolve(process.cwd(), process.env.UPLOADS_DIR ?? 'uploads');
  const audioUploadsDir = join(uploadsRoot, 'audio');

  mkdirSync(audioUploadsDir, { recursive: true });
  server.use('/uploads', expressStatic(uploadsRoot));

  configureCors(app);
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
      forbidNonWhitelisted: true,
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
}

async function buildApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = await NestFactory.create(AppModule);
  await configureApp(app);
  await app.init();
  cachedApp = app;
  return app;
}

async function bootstrap(): Promise<void> {
  const app = await buildApp();
  await app.listen(process.env.PORT ?? 3000);
}

export default async function handler(
  req: Request,
  res: Response,
): Promise<void> {
  const app = await buildApp();
  const instance = app.getHttpAdapter().getInstance() as ExpressLikeHandler;
  instance(req, res);
}

if (process.env.VERCEL !== '1') {
  void bootstrap();
}
