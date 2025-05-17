import { authConfig } from '@/config';
import { auth } from '@/config/constants';
import {
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  ApiSuccessResponseWithoutData,
} from '@/types';
import { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { SafeParseReturnType, z } from 'zod';

/**
 * Send a successful response with data
 */
export function createSuccessResponse<T, Status extends ContentfulStatusCode>(
  c: Context,
  message: string,
  data: T,
  status: Status
) {
  return c.json<ApiSuccessResponse<T>, Status>(
    {
      success: true,
      message,
      data: data,
    },
    status
  );
}

/**
 * Send a successful response without data
 */
export function createSuccessWithoutDataResponse<StatusCode extends ContentfulStatusCode>(
  c: Context,
  message: string,
  status: StatusCode
) {
  return c.json<ApiSuccessResponseWithoutData, StatusCode>(
    {
      success: true,
      message,
    },
    status
  );
}

/**
 * Send a paginated response with metadata
 */
export function createPaginatedResponse<T>(
  c: Context,
  message: string,
  data: T[],
  { total, page, limit }: { total: number; page: number; limit: number }
) {
  return c.json<ApiPaginatedResponse<T>, 200>(
    {
      success: true,
      message,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    },
    200
  );
}

/**
 * Send an error response
 */
export function createErrorResponse<StatusCode extends ContentfulStatusCode>(
  c: Context,
  message: string,
  status: StatusCode,
  errors?: any
) {
  return c.json<ApiErrorResponse, StatusCode>(
    {
      success: false,
      error: {
        message,
        ...(errors && { details: errors }),
      },
    },
    status
  );
}

/**
 * Create and throw an HTTP exception
 */
export function throwError(message: string, status: ContentfulStatusCode = 400): never {
  throw new HTTPException(status, { message });
}

/**
 * Send a no content response (204)
 */
export function createNoContentResponse(c: Context) {
  return c.body(null, 204);
}

/**
 * Set authentication cookies
 */
export function setAuthCookies(c: Context, tokens: any) {
  setCookie(c, auth.cookies.ACCESS_TOKEN, tokens.accessToken, {
    httpOnly: authConfig.cookies.httpOnly,
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
    maxAge: tokens.expiresIn * 1000,
    path: '/',
  });

  setCookie(c, auth.cookies.REFRESH_TOKEN, tokens.refreshToken, {
    httpOnly: authConfig.cookies.httpOnly,
    secure: authConfig.cookies.secure,
    sameSite: authConfig.cookies.sameSite,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

/**
 * Clear authentication cookies
 */
export function clearAuthCookies(c: Context) {
  deleteCookie(c, auth.cookies.ACCESS_TOKEN, {
    httpOnly: true,
    secure: authConfig.cookies.secure,
    maxAge: 0,
    path: '/',
  });

  deleteCookie(c, auth.cookies.REFRESH_TOKEN, {
    httpOnly: true,
    secure: authConfig.cookies.secure,
    maxAge: 0,
    path: '/',
  });
}

/**
 * Get access token from request
 */
export function getAccessToken(c: Context): string | undefined {
  const authHeader = c.req.header(auth.headers.AUTHORIZATION);
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return c.req.query('token');

  // return undefined;
}

/**
 * Get refresh token from request
 */
export function getRefreshToken(c: Context): string | undefined {
  const cookieToken = getCookie(c, auth.cookies.REFRESH_TOKEN);
  if (cookieToken) return cookieToken;

  return undefined;
}

export function resolveApiResponseSchema<T>(schema: z.ZodType<T>) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: schema,
  });
}

export function resolvePaginatedApiResponseSchema<T>(schema: z.ZodType<T>) {
  return z.object({
    success: z.literal(true),
    message: z.string(),
    data: schema.array(),
    pagination: z.object({
      total: z.number(),
      page: z.number(),
      limit: z.number(),
      pages: z.number(),
      hasMore: z.boolean(),
    }),
  });
}
export function validationHook(result: SafeParseReturnType<any, any>, c: Context) {
  if (result.success) {
    return;
  }
  const issue = result.error.issues[0].message;
  return createErrorResponse(c, issue, 400);
}

export async function placeholder(c: Context) {
  return createSuccessResponse(c, 'Placeholder here', undefined, 200);
}
