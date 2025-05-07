import { ServiceErrorCode, ServiceResult } from '@/types';

export function createSuccessResult<T>(message: string, data: T): ServiceResult<T> {
  return {
    ok: true,
    message,
    data,
  };
}

export function createErrorResult<T>(
  message: string,
  code: ServiceErrorCode,
  details?: Record<string, string[]>
): ServiceResult<T> {
  return {
    ok: false,
    message,
    error: {
      message,
      details,
      code,
    },
  };
}
