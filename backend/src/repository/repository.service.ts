import { Injectable } from '@nestjs/common';
import { GitHubApiService } from '../github/github-api.service';
import { ScoringService } from '../scoring/scoring.service';
import { SearchResult } from '@github-repo-scorer/shared';

@Injectable()
export class RepositoryService {
  constructor(
    private readonly githubApiService: GitHubApiService,
    private readonly scoringService: ScoringService,
  ) {}

  async searchRepositories(
    language: string,
    createdAfter?: string,
  ): Promise<SearchResult> {
    const repositories = await this.githubApiService.searchRepositories(
      language,
      createdAfter,
    );

    const scored = this.scoringService.scoreRepositories(repositories);

    return {
      data: scored,
      totalCount: scored.length,
    };
  }
}
