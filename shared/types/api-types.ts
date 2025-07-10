/**
 * Shared API Types and Constants
 * These types define the contract between client and server
 * Both frontend and backend need access to these definitions
 */

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasMore: boolean;
    };
  };
}

export interface ApiErrorResponse {
  success: false;
  error: ErrorObject;
  meta?: {
    timestamp: string;
    version?: string;
  };
}

export interface ErrorObject {
  code: number;
  message: string;
  messageKey: string;
  details?: any;
  field?: string; // For validation errors
  provider?: string; // For provider-specific errors
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standard error codes matching i18n configuration
 * Both client and server need these for error handling
 */
export const ErrorCodes = {
  FALLBACK_PROVIDER_NEEDED: 1001,
  VOICE_CLONING_FAILED: 1002,
  VIDEO_GENERATION_FAILED: 1003,
  PROVIDER_NOT_AVAILABLE: 1004,
  API_RATE_LIMIT: 1005,
  INVALID_API_KEY: 1006,
  INSUFFICIENT_SAMPLES: 1007,
  NARRATION_GENERATION_FAILED: 1008,
  SUBSCRIPTION_LIMIT_REACHED: 1009,
  AUTHENTICATION_REQUIRED: 1010,
  
  // Validation errors (2xxx)
  VALIDATION_FAILED: 2001,
  INVALID_INPUT: 2002,
  MISSING_REQUIRED_FIELD: 2003,
  
  // Database errors (3xxx)
  RESOURCE_NOT_FOUND: 3001,
  DUPLICATE_RESOURCE: 3002,
  DATABASE_ERROR: 3003,
  
  // Server errors (5xxx)
  INTERNAL_SERVER_ERROR: 5000,
  SERVICE_UNAVAILABLE: 5001,
} as const;