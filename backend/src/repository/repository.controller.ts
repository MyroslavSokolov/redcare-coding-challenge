import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RepositoryService } from './repository.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResult } from '@github-repo-scorer/shared';

@ApiTags('Repositories')
@Controller('api/repositories')
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search and score GitHub repositories' })
  @ApiResponse({ status: 200, description: 'Scored repositories sorted by popularity' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 429, description: 'GitHub API rate limit exceeded' })
  @ApiResponse({ status: 504, description: 'GitHub API request timed out' })
  async search(@Query() query: SearchQueryDto): Promise<SearchResult> {
    return this.repositoryService.searchRepositories(
      query.language,
      query.createdAfter,
      query.perPage,
    );
  }
}
