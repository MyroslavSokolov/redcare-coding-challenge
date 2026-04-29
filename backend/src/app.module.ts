import { Module } from '@nestjs/common';
import { ScoringModule } from './scoring/scoring.module';
import { GitHubModule } from './github/github.module';
import { RepositoryModule } from './repository/repository.module';

@Module({
  imports: [ScoringModule, GitHubModule, RepositoryModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
