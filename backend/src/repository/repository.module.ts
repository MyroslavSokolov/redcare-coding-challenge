import { Module } from '@nestjs/common';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';
import { GitHubModule } from '../github/github.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [GitHubModule, ScoringModule],
  controllers: [RepositoryController],
  providers: [RepositoryService],
  exports: [RepositoryService],
})
export class RepositoryModule {}
