import { HttpException, HttpStatus } from '@nestjs/common';

export class GitHubTimeoutException extends HttpException {
  constructor() {
    super(
      'GitHub API request timed out',
      HttpStatus.GATEWAY_TIMEOUT,
    );
  }
}
