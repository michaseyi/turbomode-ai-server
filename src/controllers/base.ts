import { authConfig } from '@/config';
import { AUTH } from '@/config/constants';
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

/**
 * Base controller class with common response methods
 * All controllers should extend this class for consistent response handling
 */
export class BaseController {
  /**
   * Send a successful response with data
   */
  sendSuccess<T, Status extends ContentfulStatusCode>(
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
  sendSuccessWithoutData<StatusCode extends ContentfulStatusCode>(
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
  sendPaginated<T>(
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
  sendError<StatusCode extends ContentfulStatusCode>(
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
  throwError(message: string, status: ContentfulStatusCode = 400): never {
    throw new HTTPException(status, { message });
  }

  /**
   * Send a no content response (204)
   */
  sendNoContent(c: Context) {
    return c.body(null, 204);
  }

  /**
   * Set authentication cookies
   */
  protected setAuthCookies(c: Context, tokens: any) {
    setCookie(c, AUTH.COOKIES.ACCESS_TOKEN, tokens.accessToken, {
      httpOnly: authConfig.cookies.httpOnly,
      secure: authConfig.cookies.secure,
      sameSite: authConfig.cookies.sameSite,
      maxAge: tokens.expiresIn * 1000,
      path: '/',
    });

    setCookie(c, AUTH.COOKIES.REFRESH_TOKEN, tokens.refreshToken, {
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
  protected clearAuthCookies(c: Context) {
    deleteCookie(c, AUTH.COOKIES.ACCESS_TOKEN, {
      httpOnly: true,
      secure: authConfig.cookies.secure,
      maxAge: 0,
      path: '/',
    });

    deleteCookie(c, AUTH.COOKIES.REFRESH_TOKEN, {
      httpOnly: true,
      secure: authConfig.cookies.secure,
      maxAge: 0,
      path: '/',
    });
  }

  /**
   * Get access token from request
   */
  protected getAccessToken(c: Context): string | undefined {
    const cookieToken = getCookie(c, AUTH.COOKIES.ACCESS_TOKEN);
    if (cookieToken) return cookieToken;

    const authHeader = c.req.header(AUTH.HEADERS.AUTHORIZATION);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }

  /**
   * Get refresh token from request
   */
  protected getRefreshToken(c: Context): string | undefined {
    const cookieToken = getCookie(c, AUTH.COOKIES.REFRESH_TOKEN);
    if (cookieToken) return cookieToken;

    return undefined;
  }
}

export const baseController = new BaseController();
