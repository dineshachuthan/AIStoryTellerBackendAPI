/**
 * Server-side API Response Helper Functions
 * These helpers are only used by the server to create standardized responses
 */

import type { ApiSuccessResponse, ApiErrorResponse, ErrorCodes } from '@shared/types/api-types';

/**
 * Helper to create success response
 */
export function createSuccessResponse<T>(data: T, meta?: ApiSuccessResponse['meta']): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta
    }
  };
}

/**
 * Helper to create error response
 */
export function createErrorResponse(
  code: number,
  messageKey: string,
  message: string,
  details?: any
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      messageKey,
      details
    },
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Helper to create error from exception
 */
export function createErrorFromException(error: any, ErrorCodes: typeof import('@shared/api-types').ErrorCodes): ApiErrorResponse {
  // Check if error already has our format
  if (error.code && error.messageKey) {
    return createErrorResponse(
      error.code,
      error.messageKey,
      error.message || 'An error occurred',
      error.details
    );
  }
  
  // Default to internal server error
  return createErrorResponse(
    ErrorCodes.INTERNAL_SERVER_ERROR,
    'errors.api.internal_server_error',
    error.message || 'Internal server error',
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
  );
}