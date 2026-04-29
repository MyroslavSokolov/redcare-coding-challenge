import { Controller, Get, Query } from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from '@github-repo-scorer/shared';

@Controller('api/repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get('search')
  async search(@Query() query: SearchQueryDto): Promise<SearchResult> {
    return this.repositoryService.searchRepositories(
      query.language,
      query.createdAfter,
      query.perPage,
    );
  }
}
