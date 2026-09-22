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

  describe('markers', () => {
    async function loginAs(email: string): Promise<string> {
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, password: 'Lectura123!' });
      return login.body.accessToken as string;
    }

    it('crea un marcador, le registra un modelo 3D y lo resuelve por código', async () => {
      const connection = app.get<Connection>(MONGO_CONNECTION);
      const code = `e2e-marker-${new Types.ObjectId().toHexString().slice(-8)}`;
      const token = await loginAs('teacher@lectura.app');

      try {
        const created = await request(app.getHttpServer())
          .post('/api/markers')
          .set('Authorization', `Bearer ${token}`)
          .send({ code, name: 'Marcador e2e' });

        expect(created.status).toBe(201);
        expect(created.body).toMatchObject({ code, status: 'active' });

        const withModel = await request(app.getHttpServer())
          .put(`/api/markers/${created.body.id}/model`)
          .set('Authorization', `Bearer ${token}`)
          .send({ model_3d_url: 'https://example.com/e2e-marker.glb' });

        expect(withModel.status).toBe(200);
        expect(withModel.body).toMatchObject({
          model_3d_url: 'https://example.com/e2e-marker.glb',
          model_3d_format: 'glb',
        });

        const unauthorized = await request(app.getHttpServer()).get(
          `/api/markers/code/${code}`,
        );
        expect(unauthorized.status).toBe(401);

        const byCode = await request(app.getHttpServer())
          .get(`/api/markers/code/${code}`)
          .set('Authorization', `Bearer ${token}`);
        expect(byCode.status).toBe(200);
        expect(byCode.body.model_3d_url).toBe(
          'https://example.com/e2e-marker.glb',
        );

        // El índice único ux_markers_code tiene que estar aplicado en la base.
        const duplicated = await request(app.getHttpServer())
          .post('/api/markers')
          .set('Authorization', `Bearer ${token}`)
          .send({ code, name: 'Duplicado' });
        expect(duplicated.status).toBe(409);
      } finally {
        await connection.db?.collection('markers').deleteOne({ code });
      }
    });

    it('rechaza un código que ya pertenece a una learning unit', async () => {
      const connection = app.get<Connection>(MONGO_CONNECTION);
      const learningUnitId = new Types.ObjectId();
      const code = `e2e-taken-${learningUnitId.toHexString().slice(-8)}`;

      await connection.db?.collection('learning_units').insertOne({
        _id: learningUnitId,
        word: `Palabra-${code}`,
        marker_id: code,
        created_at: new Date(),
        updated_at: new Date(),
      });

      try {
        const token = await loginAs('teacher@lectura.app');
        const res = await request(app.getHttpServer())
          .post('/api/markers')
          .set('Authorization', `Bearer ${token}`)
          .send({ code, name: 'Colisión' });

        expect(res.status).toBe(409);
      } finally {
        await connection.db
          ?.collection('learning_units')
          .deleteOne({ _id: learningUnitId });
        await connection.db?.collection('markers').deleteOne({ code });
      }
    });

    it('permite leer a un estudiante pero no crear', async () => {
      const token = await loginAs('student@lectura.app');

      const list = await request(app.getHttpServer())
        .get('/api/markers')
        .set('Authorization', `Bearer ${token}`);
      expect(list.status).toBe(200);
      expect(Array.isArray(list.body)).toBe(true);

      const forbidden = await request(app.getHttpServer())
        .post('/api/markers')
        .set('Authorization', `Bearer ${token}`)
        .send({ code: 'e2e-forbidden', name: 'No permitido' });
      expect(forbidden.status).toBe(403);
    });
  });
});
