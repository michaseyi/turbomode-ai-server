import { baseValidation } from '@/validation/base.validation';
import { z } from 'zod';

export type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

export type ApiSuccessResponseWithoutData = z.infer<typeof baseValidation.apiResponse>;

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

export type ApiQuery<T> = {
  limit?: number;
  page?: number;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
  rangeField?: keyof T;
  rangeFrom?: string;
  rangeTo?: string;
} & T;

export enum ServiceErrorCode {
  NotFound,
  InvalidCredentials,
  Conflict,
  NotImplemented,
  Bad,
}

export interface ServiceError {
  message: string;
  code: ServiceErrorCode;
  details?: Record<string, string[]>;
}

export type ServiceResult<T = undefined> =
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

export type PaginatedT<T> = {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
};
