import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

// Gemini API key required for AIService init (not used in most e2e tests)
beforeAll(() => {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key-for-e2e';
});

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('/ (GET) health check', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });
});

describe('Creators (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('POST /creators creates a creator', () => {
    return request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Test Creator', email: 'test@example.com' })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toBe('Test Creator');
        expect(res.body.email).toBe('test@example.com');
      });
  });

  it('POST /creators rejects invalid email', () => {
    return request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Test', email: 'not-an-email' })
      .expect(400);
  });
});

describe('Content (e2e)', () => {
  let app: INestApplication<App>;
  let creatorId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();

    const creatorRes = await request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Content Creator', email: 'content@example.com' });
    creatorId = creatorRes.body.id;
  });

  afterEach(async () => {
    await app?.close();
  });

  it('POST /content creates content and enqueues job', () => {
    return request(app.getHttpServer())
      .post('/content')
      .send({
        title: 'E2E Test Post',
        description: 'Created by e2e test',
        tags: ['test', 'e2e'],
        creatorId,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.title).toBe('E2E Test Post');
        expect(res.body.status).toBe('draft');
      });
  });

  it('GET /content/:id returns content', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/content')
      .send({
        title: 'Get Test',
        description: 'For get test',
        tags: ['test'],
        creatorId,
      });
    const contentId = createRes.body.id;

    return request(app.getHttpServer())
      .get(`/content/${contentId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(contentId);
        expect(res.body.title).toBe('Get Test');
      });
  });
});

describe('Feed (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /feed returns array', () => {
    return request(app.getHttpServer())
      .get('/feed')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});
