import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

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
});
