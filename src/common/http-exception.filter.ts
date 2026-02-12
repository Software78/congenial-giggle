import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ApiResponseHelper } from './api-response.helper';
import { RequestWithId } from './request-id.middleware';

const SAFE_INTERNAL_MESSAGE = 'An unexpected error occurred';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    const requestId = request.requestId ?? 'unknown';

    const { status, message } = this.normalizeException(exception);

    const body = ApiResponseHelper.error(message, requestId, status);

    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} - ${status}: ${message}`,
      );
    }

    response.status(status).json(body);
  }

  private normalizeException(exception: unknown): {
    status: number;
    message: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const obj = exceptionResponse as Record<string, unknown>;
        const rawMessage = obj.message ?? exception.message ?? 'An error occurred';

        let message: string;
        if (Array.isArray(rawMessage)) {
          message = rawMessage.map((m) => String(m)).join('. ');
        } else {
          message = String(rawMessage);
        }

        return { status, message };
      }

      return {
        status,
        message: exception.message,
      };
    }

    if (exception instanceof QueryFailedError) {
      const dbError = exception.driverError as { code?: string } | undefined;
      const code = dbError?.code;

      if (code === '23505') {
        return {
          status: HttpStatus.CONFLICT,
          message: 'A user with this value already exists',
        };
      }

      if (code === '23503') {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference to a related resource',
        };
      }
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: SAFE_INTERNAL_MESSAGE,
    };
  }
}
