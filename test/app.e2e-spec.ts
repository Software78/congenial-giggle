import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { ResponseTransformInterceptor } from '../src/common/response-transform.interceptor';
import { HttpExceptionFilter } from '../src/common/http-exception.filter';

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
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
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
        expect(res.body).toMatchObject({
          data: { status: 'ok' },
          code: 200,
          message: 'Success',
        });
        expect(res.body.requestId).toBeDefined();
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
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('POST /creators creates a creator', () => {
    const email = `test-${Date.now()}@example.com`;
    return request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Test Creator', email })
      .expect(201)
      .expect((res) => {
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.name).toBe('Test Creator');
        expect(res.body.data.email).toBe(email);
        expect(res.body.requestId).toBeDefined();
      });
  });

  it('POST /creators rejects invalid email', () => {
    return request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Test', email: 'not-an-email' })
      .expect(400)
      .expect((res) => {
        expect(res.body.data).toBeNull();
        expect(res.body.message).toBeDefined();
        expect(res.body.requestId).toBeDefined();
      });
  });

  it('POST /creators returns 409 when email already exists', async () => {
    const email = `duplicate-${Date.now()}@example.com`;
    await request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'First', email });

    return request(app.getHttpServer())
      .post('/creators')
      .send({ name: 'Second', email })
      .expect(409)
      .expect((res) => {
        expect(res.body.data).toBeNull();
        expect(res.body.message).toBe('A user with this value already exists');
        expect(res.body.requestId).toBeDefined();
      });
  });
});

describe('Content (e2e)', () => {
  let app: INestApplication<App>;
  let creatorId: number;

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
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    const creatorRes = await request(app.getHttpServer())
      .post('/creators')
      .send({
        name: 'Content Creator',
        email: `content-${Date.now()}@example.com`,
      });
    expect(creatorRes.status).toBe(201);
    expect(creatorRes.body.data).toBeDefined();
    creatorId = creatorRes.body.data.id;
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
        expect(res.body.data).toHaveProperty('id');
        expect(res.body.data.title).toBe('E2E Test Post');
        expect(res.body.data.status).toBe('draft');
        expect(res.body.requestId).toBeDefined();
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
    const contentId = createRes.body.data.id;

    return request(app.getHttpServer())
      .get(`/content/${contentId}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.data.id).toBe(contentId);
        expect(res.body.data.title).toBe('Get Test');
        expect(res.body.requestId).toBeDefined();
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
    app.useGlobalInterceptors(new ResponseTransformInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
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
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.requestId).toBeDefined();
      });
  });
});
