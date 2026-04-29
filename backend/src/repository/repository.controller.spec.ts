import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { ScoredRepository, SearchResult } from '@github-repo-scorer/shared';

describe('RepositoryController', () => {
  let app: INestApplication;

  const mockSearchResult: SearchResult = {
    data: [
      {
        name: 'repo-one',
        fullName: 'owner/repo-one',
        description: 'A test repo',
        url: 'https://github.com/owner/repo-one',
        stars: 100,
        forks: 50,
        lastUpdated: '2025-01-15T10:00:00Z',
        score: 85.3,
      },
    ],
    totalCount: 1,
  };

  const mockRepositoryService = {
    searchRepositories: jest.fn().mockResolvedValue(mockSearchResult),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RepositoryController],
      providers: [
        { provide: RepositoryService, useValue: mockRepositoryService },
      ],
    }).compile();

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
    mockRepositoryService.searchRepositories.mockResolvedValue(mockSearchResult);
  });

  describe('GET /api/repositories/search', () => {
    it('should return 400 when language param is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('language is required');
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should return 400 when createdAfter has invalid format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'typescript', createdAfter: 'not-a-date' })
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain(
        'createdAfter must be a valid ISO 8601 date',
      );
      expect(response.body).toHaveProperty('error', 'Bad Request');
    });

    it('should return 200 with expected response shape for valid language-only request', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'typescript' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalCount');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.totalCount).toBe('number');

      const repo = response.body.data[0] as ScoredRepository;
      expect(repo).toHaveProperty('name');
      expect(repo).toHaveProperty('fullName');
      expect(repo).toHaveProperty('description');
      expect(repo).toHaveProperty('url');
      expect(repo).toHaveProperty('stars');
      expect(repo).toHaveProperty('forks');
      expect(repo).toHaveProperty('lastUpdated');
      expect(repo).toHaveProperty('score');

      expect(mockRepositoryService.searchRepositories).toHaveBeenCalledWith(
        'typescript',
        undefined,
        30,
      );
    });

    it('should return 200 with expected response shape for valid language and createdAfter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/repositories/search')
        .query({ language: 'python', createdAfter: '2024-01-01' })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalCount');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(typeof response.body.totalCount).toBe('number');

      expect(mockRepositoryService.searchRepositories).toHaveBeenCalledWith(
        'python',
        '2024-01-01',
        30,
      );
    });
  });
});
