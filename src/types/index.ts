/**
 * Base API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

/**
 * Pagination parameters interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/**
 * Sort direction type
 */
export type SortDirection = 'asc' | 'desc';

/**
 * API Error interface
 */
export interface ApiError {
  message: string;
  status: number;
  details?: Record<string, string[]>;
}

/**
 * Service result interface for consistent returns
 */
export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

