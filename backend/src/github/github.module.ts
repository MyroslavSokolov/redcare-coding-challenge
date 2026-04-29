import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GitHubApiService } from './github-api.service';

@Module({
  imports: [HttpModule],
  providers: [GitHubApiService],
  exports: [GitHubApiService],
})
export class GitHubModule {}
