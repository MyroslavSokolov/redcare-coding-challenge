import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { GitHubRateLimitException, GitHubTimeoutException } from '../../github/exceptions';
import { ApiErrorResponse } from '@github-repo-scorer/shared';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string;
    let error: string;

    if (exception instanceof GitHubRateLimitException) {
      statusCode = HttpStatus.TOO_MANY_REQUESTS;
      message = exception.message;
      error = 'Too Many Requests';
    } else if (exception instanceof GitHubTimeoutException) {
      statusCode = HttpStatus.GATEWAY_TIMEOUT;
      message = exception.message;
      error = 'Gateway Timeout';
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = Array.isArray(resp.message)
          ? resp.message.join(', ')
          : (resp.message as string) || exception.message;
      } else {
        message = exception.message;
      }

      error = this.getErrorName(statusCode);
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';
    }

    const body: ApiErrorResponse = { statusCode, message, error };
    response.status(statusCode).json(body);
  }

  private getErrorName(statusCode: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      504: 'Gateway Timeout',
    };
    return names[statusCode] || 'Error';
  }
}
