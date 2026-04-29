import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import { GitHubRepository } from './interfaces/github-repository.interface';
import {
  GitHubRateLimitException,
  GitHubTimeoutException,
} from './exceptions';
import { TtlCacheService } from '../common/cache/ttl-cache.service';

@Injectable()
export class GitHubApiService {
  private static readonly GITHUB_SEARCH_URL =
    'https://api.github.com/search/repositories';
  private static readonly TIMEOUT_MS = 10000;
  private static readonly CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly cache: TtlCacheService,
  ) {}

  async searchRepositories(
    language: string,
    createdAfter?: string,
    perPage: number = 30,
  ): Promise<GitHubRepository[]> {
    const cacheKey = this.buildCacheKey(language, createdAfter, perPage);
    const cached = this.cache.get<GitHubRepository[]>(cacheKey);

    if (cached) {
      return cached;
    }

    const query = this.buildQuery(language, createdAfter);

    try {
      const response = await firstValueFrom(
        this.httpService.get<{ items: GitHubRepository[] }>(
          GitHubApiService.GITHUB_SEARCH_URL,
          {
            params: {
              q: query,
              sort: 'stars',
              order: 'desc',
              per_page: perPage,
            },
            timeout: GitHubApiService.TIMEOUT_MS,
          },
        ),
      );

      const items = response.data.items;
      this.cache.set(cacheKey, items, GitHubApiService.CACHE_TTL_MS);

      return items;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown): never {
    if (error instanceof AxiosError) {
      if (
        error.code === 'ECONNABORTED' ||
        error.code === 'ETIMEDOUT'
      ) {
        throw new GitHubTimeoutException();
      }

      if (error.response) {
        const { status, headers } = error.response;

        if (
          status === 403 &&
          headers['x-ratelimit-remaining'] === '0'
        ) {
          const resetTimestamp = headers['x-ratelimit-reset'];
          const resetTime = resetTimestamp
            ? new Date(Number(resetTimestamp) * 1000).toISOString()
            : 'unknown';
          throw new GitHubRateLimitException(resetTime);
        }

        const message =
          error.response.data?.message ||
          error.message ||
          'GitHub API error';
        throw new HttpException(message, status);
      }
    }

    throw new HttpException(
      'An unexpected error occurred while contacting GitHub API',
      HttpStatus.BAD_GATEWAY,
    );
  }

  private buildQuery(language: string, createdAfter?: string): string {
    let query = `language:${language}`;

    if (createdAfter) {
      query += ` created:>=${createdAfter}`;
    }

    return query;
  }

  private buildCacheKey(language: string, createdAfter?: string, perPage?: number): string {
    return `${language}:${createdAfter ?? ''}:${perPage ?? 30}`;
  }
}
