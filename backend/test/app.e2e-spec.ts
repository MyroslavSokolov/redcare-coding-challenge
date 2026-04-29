import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AxiosHeaders, AxiosResponse } from 'axios';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

/**
 * E2E test that boots the full NestJS application (all real modules, services,
 * and pipes) with only the external GitHub HTTP call mocked.
 *
 * This validates the entire request flow:
 *   HTTP request → validation → controller → service → scoring → response
 */
describe('App (e2e)', () => {
  let app: INestApplication;
  let httpServiceMock: { get: jest.Mock };

  const mockGitHubResponse: AxiosResponse = {
    data: {
      items: [
        {
          id: 1,
          name: 'popular-repo',
          full_name: 'owner/popular-repo',
          description: 'A very popular repository',
          html_url: 'https://github.com/owner/popular-repo',
          stargazers_count: 5000,
          forks_count: 1200,
          updated_at: '2026-04-20T10:00:00Z',
          created_at: '2023-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'newer-repo',
          full_name: 'owner/newer-repo',
          description: null,
          html_url: 'https://github.com/owner/newer-repo',
          stargazers_count: 800,
          forks_count: 100,
          updated_at: '2026-04-28T10:00:00Z',
          created_at: '2025-06-01T00:00:00Z',
        },
      ],
    },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };

  beforeAll(async () => {
    httpServiceMock = { get: jest.fn() };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue(httpServiceMock)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    httpServiceMock.get.mockReturnValue(of(mockGitHubResponse));
  });

  describe('GET /api/repositories/search', () => {
    it('returns scored and sorted repositories for a valid search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'typescript' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.totalCount).toBe(2);

      // Verify scoring was applied — each repo should have a numeric score
      for (const repo of response.body.data) {
        expect(typeof repo.score).toBe('number');
        expect(repo.score).toBeGreaterThanOrEqual(0);
        expect(repo.score).toBeLessThanOrEqual(100);
      }

      // Results should be sorted by score descending
      expect(response.body.data[0].score).toBeGreaterThanOrEqual(
        response.body.data[1].score,
      );

      // Verify field mapping from GitHub's snake_case to our camelCase
      const first = response.body.data[0];
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('fullName');
      expect(first).toHaveProperty('url');
      expect(first).toHaveProperty('stars');
      expect(first).toHaveProperty('forks');
      expect(first).toHaveProperty('lastUpdated');
    });

    it('passes query parameters to the GitHub API correctly', async () => {
      await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'python', createdAfter: '2024-01-01', perPage: 50 })
        .expect(200);

      expect(httpServiceMock.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'language:python created:>=2024-01-01',
            per_page: 50,
          }),
        }),
      );
    });

    it('returns 400 for missing language parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('language is required');
    });

    it('returns 400 for invalid createdAfter date', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'rust', createdAfter: 'invalid' })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('createdAfter must be a valid ISO 8601 date');
    });

    it('returns 400 for invalid perPage value', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'go', perPage: 25 })
        .expect(400);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.message).toContain('perPage must be one of');
    });

    it('returns empty results when GitHub returns no items', async () => {
      httpServiceMock.get.mockReturnValue(
        of({
          ...mockGitHubResponse,
          data: { items: [] },
        }),
      );

      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'brainfuck' })
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.totalCount).toBe(0);
    });

    it('uses cache on repeated identical requests', async () => {
      // First request — hits GitHub
      await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'cached-lang' })
        .expect(200);

      // Second identical request — should use cache
      await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'cached-lang' })
        .expect(200);

      // GitHub API should only be called once
      expect(httpServiceMock.get).toHaveBeenCalledTimes(1);
    });
  });
});
