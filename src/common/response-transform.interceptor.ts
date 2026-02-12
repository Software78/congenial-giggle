import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiResponse } from './api-response.helper';
import { ApiResponseHelper } from './api-response.helper';
import { RequestWithId } from './request-id.middleware';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<unknown>> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const requestId = request.requestId;
    const httpMethod = request.method;

    return next.handle().pipe(
      map((data: unknown) => {
        if (this.isAlreadyApiResponse(data)) {
          return { ...data, requestId };
        }
        const code = httpMethod === 'POST' ? 201 : 200;
        return ApiResponseHelper.success(data, requestId, 'Success', code);
      }),
    );
  }

  private isAlreadyApiResponse(value: unknown): value is ApiResponse {
    return (
      value !== null &&
      typeof value === 'object' &&
      'data' in value &&
      'code' in value &&
      'message' in value
    );
  }
}
