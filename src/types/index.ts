import { ContentfulStatusCode } from 'hono/utils/http-status';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: Record<string, string[]>;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export type SortDirection = 'asc' | 'desc';

export interface ServiceError {
  message: string;
  details?: Record<string, string[]>;
}

/**
 * Service result interface for consistent returns
 */
// export interface ServiceResult<T> {
//   success: boolean;
//   data?: T;
//   error?: ApiError;
// }

export type ServiceResult<T> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: ServiceError;
    };
