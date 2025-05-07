import { baseValidation } from '@/validation';
import { z } from 'zod';

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiSuccessResponseWithoutData = z.infer<typeof baseValidation.apiDatalessResponse>;

export type ApiErrorResponse = z.infer<typeof baseValidation.apiErrorResponse>;

export type ApiPaginatedResponse<T> = {
  success: true;
  message: string;
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
};

export enum ServiceErrorCode {
  NotFound,
  InvalidCredentials,
  Conflict,
  NotImplemented,
}

export interface ServiceError {
  message: string;
  code: ServiceErrorCode;
  details?: Record<string, string[]>;
}

export type ServiceResult<T> =
  | {
      ok: true;
      message: string;
      data: T;
    }
  | {
      ok: false;
      message: string;
      error: ServiceError;
    };
