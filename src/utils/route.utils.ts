import { baseValidation } from '@/validation/base.validation';

export const errorResponses = {
  400: {
    description:
      'Bad Request – The server could not process the request due to client error (e.g., validation failure).',
    content: {
      'application/json': {
        schema: baseValidation.apiErrorResponse,
      },
    },
  },
  401: {
    description:
      'Unauthorized – Authentication is required and has either failed or not been provided.',
    content: {
      'application/json': {
        schema: baseValidation.apiErrorResponse,
      },
    },
  },
  403: {
    description:
      'Forbidden – You are authenticated but do not have permission to access the requested resource.',
    content: {
      'application/json': {
        schema: baseValidation.apiErrorResponse,
      },
    },
  },
  404: {
    description: 'Not Found – The requested resource could not be found on the server.',
    content: {
      'application/json': {
        schema: baseValidation.apiErrorResponse,
      },
    },
  },
  500: {
    description: 'Internal Server Error – An unexpected error occurred on the server.',
    content: {
      'application/json': {
        schema: baseValidation.apiErrorResponse,
      },
    },
  },
};
