import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosHeaders, AxiosResponse } from 'axios';
import { GitHubApiService } from './github-api.service';
import { GitHubRateLimitException } from './exceptions/github-rate-limit.exception';
import { GitHubTimeoutException } from './exceptions/github-timeout.exception';
import { GitHubRepository } from './interfaces/github-repository.interface';

describe('GitHubApiService', () => {
  let service: GitHubApiService;
  let httpService: { get: jest.Mock };

  beforeEach(() => {
    httpService = { get: jest.fn() };
    service = new GitHubApiService(httpService as unknown as HttpService);
  });

  /** Helper to build a minimal AxiosResponse. */
  function makeAxiosResponse<T>(data: T, status = 200): AxiosResponse<T> {
    return {
      data,
      status,
      statusText: 'OK',
      headers: {},
      config: { headers: new AxiosHeaders() },
    };
  }

  /** Helper to build an AxiosError with a response. */
  function makeAxiosError(
    status: number,
    headers: Record<string, string> = {},
    data: Record<string, unknown> = {},
    code?: string,
  ): AxiosError {
    const error = new AxiosError(
      `Request failed with status code ${status}`,
      code,
      { headers: new AxiosHeaders() } as any,
      {},
      {
        data,
        status,
        statusText: '',
        headers,
        config: { headers: new AxiosHeaders() },
      },
    );
    return error;
  }

  describe('successful response mapping', () => {
    it('maps GitHub API response items to GitHubRepository[]', async () => {
      const items: GitHubRepository[] = [
        {
          id: 1,
          name: 'repo-one',
          full_name: 'owner/repo-one',
          description: 'First repo',
          html_url: 'https://github.com/owner/repo-one',
          stargazers_count: 100,
          forks_count: 50,
          updated_at: '2025-01-15T10:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 2,
          name: 'repo-two',
          full_name: 'owner/repo-two',
          description: null,
          html_url: 'https://github.com/owner/repo-two',
          stargazers_count: 200,
          forks_count: 80,
          updated_at: '2025-01-10T10:00:00Z',
          created_at: '2023-06-01T00:00:00Z',
        },
      ];

      httpService.get.mockReturnValue(
        of(makeAxiosResponse({ items })),
      );

      const result = await service.searchRepositories('typescript');

      expect(result).toEqual(items);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('repo-one');
      expect(result[1].name).toBe('repo-two');
    });

    it('passes language and createdAfter to the GitHub API query', async () => {
      httpService.get.mockReturnValue(
        of(makeAxiosResponse({ items: [] })),
      );

      await service.searchRepositories('python', '2024-06-01');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: {
            q: 'language:python created:>=2024-06-01',
            sort: 'stars',
            order: 'desc',
            per_page: 30,
          },
        }),
      );
    });

    it('omits createdAfter from query when not provided', async () => {
      httpService.get.mockReturnValue(
        of(makeAxiosResponse({ items: [] })),
      );

      await service.searchRepositories('rust');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.github.com/search/repositories',
        expect.objectContaining({
          params: {
            q: 'language:rust',
            sort: 'stars',
            order: 'desc',
            per_page: 30,
          },
        }),
      );
    });

    it('returns an empty array when GitHub API returns no items', async () => {
      httpService.get.mockReturnValue(
        of(makeAxiosResponse({ items: [] })),
      );

      const result = await service.searchRepositories('cobol');

      expect(result).toEqual([]);
    });
  });

  describe('HTTP error forwarding (4xx/5xx)', () => {
    it('throws HttpException with 404 status for Not Found errors', async () => {
      const error = makeAxiosError(404, {}, { message: 'Not Found' });
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws HttpException with 500 status for Internal Server Error', async () => {
      const error = makeAxiosError(500, {}, { message: 'Internal Server Error' });
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toThrow(HttpException);

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toMatchObject({
        status: 500,
      });
    });

    it('uses error.response.data.message when available', async () => {
      const error = makeAxiosError(422, {}, { message: 'Validation Failed' });
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).message).toBe('Validation Failed');
        expect((e as HttpException).getStatus()).toBe(422);
      }
    });

    it('falls back to error.message when response data has no message', async () => {
      const error = makeAxiosError(503, {}, {});
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).message).toBe(
          'Request failed with status code 503',
        );
        expect((e as HttpException).getStatus()).toBe(503);
      }
    });
  });

  describe('timeout handling', () => {
    it('throws GitHubTimeoutException for ECONNABORTED errors', async () => {
      const error = new AxiosError(
        'timeout of 10000ms exceeded',
        'ECONNABORTED',
      );
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toThrow(GitHubTimeoutException);
    });

    it('throws GitHubTimeoutException for ETIMEDOUT errors', async () => {
      const error = new AxiosError(
        'connect ETIMEDOUT',
        'ETIMEDOUT',
      );
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toThrow(GitHubTimeoutException);
    });

    it('GitHubTimeoutException has GATEWAY_TIMEOUT status', async () => {
      const error = new AxiosError('timeout', 'ECONNABORTED');
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubTimeoutException);
        expect((e as GitHubTimeoutException).getStatus()).toBe(
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
    });
  });

  describe('rate limit detection', () => {
    it('throws GitHubRateLimitException when 403 with x-ratelimit-remaining: 0', async () => {
      const resetTimestamp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const error = makeAxiosError(
        403,
        {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetTimestamp),
        },
        { message: 'API rate limit exceeded' },
      );
      httpService.get.mockReturnValue(throwError(() => error));

      await expect(
        service.searchRepositories('typescript'),
      ).rejects.toThrow(GitHubRateLimitException);
    });

    it('includes the reset time from x-ratelimit-reset header', async () => {
      const resetTimestamp = 1705312800; // fixed timestamp
      const expectedResetTime = new Date(resetTimestamp * 1000).toISOString();

      const error = makeAxiosError(
        403,
        {
          'x-ratelimit-remaining': '0',
          'x-ratelimit-reset': String(resetTimestamp),
        },
        { message: 'API rate limit exceeded' },
      );
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubRateLimitException);
        expect((e as GitHubRateLimitException).resetTime).toBe(expectedResetTime);
        expect((e as GitHubRateLimitException).getStatus()).toBe(
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    });

    it('uses "unknown" reset time when x-ratelimit-reset header is missing', async () => {
      const error = makeAxiosError(
        403,
        { 'x-ratelimit-remaining': '0' },
        { message: 'API rate limit exceeded' },
      );
      httpService.get.mockReturnValue(throwError(() => error));

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(GitHubRateLimitException);
        expect((e as GitHubRateLimitException).resetTime).toBe('unknown');
      }
    });

    it('does NOT throw GitHubRateLimitException for 403 without rate limit headers', async () => {
      const error = makeAxiosError(
        403,
        {},
        { message: 'Forbidden' },
      );
      httpService.get.mockReturnValue(throwError(() => error));

      // Should throw a regular HttpException, not GitHubRateLimitException
      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).not.toBeInstanceOf(GitHubRateLimitException);
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(403);
      }
    });
  });

  describe('non-Axios errors', () => {
    it('throws HttpException with BAD_GATEWAY for unexpected errors', async () => {
      httpService.get.mockReturnValue(
        throwError(() => new Error('Something unexpected')),
      );

      try {
        await service.searchRepositories('typescript');
        fail('Expected an error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(HttpStatus.BAD_GATEWAY);
        expect((e as HttpException).message).toBe(
          'An unexpected error occurred while contacting GitHub API',
        );
      }
    });
  });
});
