/**
 * API Test Suite Configuration
 * Defines test endpoints, expected responses, and validation rules
 */

export interface TestEndpoint {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  category: 'stories' | 'auth' | 'narration' | 'email' | 'notification' | 'roleplay' | 'video' | 'voice' | 'emotion';
  requiresAuth: boolean;
  testCases: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  input?: any;
  headers?: Record<string, string>;
  expectedStatus: number;
  expectedResponse?: any;
  validateResponse?: (response: any) => boolean;
  shouldFail?: boolean;
}

export interface TestData {
  auth: {
    validSessionCookie: string;
  };
  users: {
    validUserId: string;
    invalidUserId: string;
    testEmail: string;
  };
  stories: {
    validStoryId: number;
    invalidStoryId: number;
    draftStoryId: number;
    publicStoryId: number;
  };
  roleplay: {
    validTemplateId: number;
    validInvitationToken: string;
  };
  voice: {
    validVoiceId: string;
    validEmotion: string;
  };
}

// Test server configuration
export const TEST_CONFIG = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:5000',
  timeout: 30000,
  retryAttempts: 3,
  headers: {
    'Content-Type': 'application/json',
  },
};

// API response structure validation
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: number;
    message: string;
    details?: any;
  };
}

// Validation helpers
export const validateApiResponse = (response: any): response is ApiResponse => {
  return (
    typeof response === 'object' &&
    typeof response.success === 'boolean' &&
    (response.success ? response.data !== undefined : response.error !== undefined)
  );
};

export const validateErrorResponse = (response: any, expectedCode?: number): boolean => {
  if (!validateApiResponse(response) || response.success) return false;
  if (expectedCode && response.error?.code !== expectedCode) return false;
  return true;
};

export const validateSuccessResponse = (response: any): boolean => {
  return validateApiResponse(response) && response.success === true;
};