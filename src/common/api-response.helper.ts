export interface ApiResponse<T = unknown> {
  requestId: string;
  data: T | null;
  code: number;
  message: string;
}

export class ApiResponseHelper {
  static success<T>(
    data: T,
    requestId: string,
    message = 'Success',
    code = 200,
  ): ApiResponse<T> {
    return {
      requestId,
      data,
      code,
      message,
    };
  }

  static error(
    message: string,
    requestId: string,
    code = 400,
  ): ApiResponse<null> {
    return {
      requestId,
      data: null,
      code,
      message,
    };
  }
}
