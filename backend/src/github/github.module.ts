import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GitHubApiService } from './github-api.service';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [HttpModule, CacheModule],
  providers: [GitHubApiService],
  exports: [GitHubApiService],
})
export class GitHubModule {}
