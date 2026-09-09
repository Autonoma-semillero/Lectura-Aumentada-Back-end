import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Connection } from 'mongoose';
import { Types } from 'mongoose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MONGO_CONNECTION } from '../src/database/mongodb.providers';

describe('App (e2e)', () => {
  let app: import('@nestjs/common').INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/auth/login returns token for seeded demo student', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student@lectura.app', password: 'Lectura123!' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.user?.email).toBe('student@lectura.app');
  });

  it('GET /api/categories with Bearer is authorized', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student@lectura.app', password: 'Lectura123!' });
    const token = login.body.accessToken as string;

    const res = await request(app.getHttpServer())
      .get('/api/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/assets/word/:word resolves an accented OCR word with Bearer', async () => {
    const connection = app.get<Connection>(MONGO_CONNECTION);
    const learningUnitId = new Types.ObjectId();
    const suffix = learningUnitId.toHexString().slice(-8);
    const storedWord = `Árbol-Prueba-${suffix}`;
    const requestedWord = `ARBOL-PRUEBA-${suffix}`;

    await connection.db?.collection('learning_units').insertOne({
      _id: learningUnitId,
      word: storedWord,
      marker_id: `e2e-ocr-${suffix}`,
      assets: { model_3d: 'https://example.com/e2e-tree.glb' },
      created_at: new Date(),
      updated_at: new Date(),
    });

    try {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'student@lectura.app', password: 'Lectura123!' });
      const token = login.body.accessToken as string;

      const unauthorized = await request(app.getHttpServer()).get(
        `/api/assets/word/${encodeURIComponent(requestedWord)}`,
      );
      expect(unauthorized.status).toBe(401);

      const response = await request(app.getHttpServer())
        .get(`/api/assets/word/${encodeURIComponent(requestedWord)}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        learning_unit_id: learningUnitId.toHexString(),
        word: storedWord,
        model_3d: 'https://example.com/e2e-tree.glb',
      });
    } finally {
      await connection.db
        ?.collection('learning_units')
        .deleteOne({ _id: learningUnitId });
    }
  });
});
