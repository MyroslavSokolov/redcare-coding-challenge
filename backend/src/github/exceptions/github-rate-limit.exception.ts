import { HttpException, HttpStatus } from '@nestjs/common';

export class GitHubRateLimitException extends HttpException {
  public readonly resetTime: string;

  constructor(resetTime: string) {
    super(
      `GitHub API rate limit exceeded. Resets at ${resetTime}`,
      HttpStatus.TOO_MANY_REQUESTS,
    );
    this.resetTime = resetTime;
  }
}
