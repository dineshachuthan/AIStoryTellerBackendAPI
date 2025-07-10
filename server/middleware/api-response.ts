/**
 * Express middleware for standardized API responses
 */

import { Request, Response, NextFunction } from 'express';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  createErrorFromException,
  ErrorCodes,
  ApiResponse 
} from '../../shared/types/api-response';

// Extend Express Response type to include our helper methods
declare global {
  namespace Express {
    interface Response {
      sendSuccess<T>(data: T, meta?: any): void;
      sendError(code: number, messageKey: string, message: string, details?: any, statusCode?: number): void;
      sendException(error: any, statusCode?: number): void;
    }
  }
}

/**
 * API Response middleware - adds standardized response methods to res object
 */
export function apiResponseMiddleware(req: Request, res: Response, next: NextFunction) {
  // Success response helper
  res.sendSuccess = function<T>(data: T, meta?: any) {
    const response = createSuccessResponse(data, meta);
    return res.status(200).json(response);
  };
  
  // Error response helper
  res.sendError = function(
    code: number, 
    messageKey: string, 
    message: string, 
    details?: any,
    statusCode: number = 400
  ) {
    const response = createErrorResponse(code, messageKey, message, details);
    return res.status(statusCode).json(response);
  };
  
  // Exception response helper
  res.sendException = function(error: any, statusCode: number = 500) {
    const response = createErrorFromException(error);
    
    // Determine appropriate status code based on error code
    let status = statusCode;
    if (error.code) {
      if (error.code >= 1000 && error.code < 2000) {
        status = 400; // Client errors
      } else if (error.code >= 2000 && error.code < 3000) {
        status = 422; // Validation errors
      } else if (error.code >= 3000 && error.code < 4000) {
        status = 404; // Not found errors
      } else if (error.code >= 5000) {
        status = 500; // Server errors
      }
    }
    
    return res.status(status).json(response);
  };
  
  next();
}

/**
 * Global error handler middleware
 */
export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Log error for debugging
  console.error('API Error:', err);
  
  // Use our standardized error response
  res.sendException(err);
}