/**
 * Auth API Endpoint Tests
 * Tests all authentication-related endpoints
 */

import { TestEndpoint } from '../test-config';
import { testData, testCredentials } from '../test-data';

export const authEndpoints: TestEndpoint[] = [
  {
    name: 'Get Current User',
    method: 'GET',
    path: '/api/auth/user',
    category: 'auth',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return current user when authenticated',
        description: 'Validates user object structure matches api-client interface',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.id && response.email && typeof response.id === 'string';
        },
      },
      {
        name: 'Should return 401 when not authenticated',
        description: 'Tests unauthorized access handling',
        expectedStatus: 401,
        headers: { Cookie: '' }, // Remove auth cookie
        shouldFail: true,
        validateResponse: (response) => {
          return response.message === 'Not authenticated';
        },
      },
    ],
  },
  {
    name: 'Login',
    method: 'POST',
    path: '/api/auth/login',
    category: 'auth',
    requiresAuth: false,
    testCases: [
      {
        name: 'Should login with valid credentials',
        description: 'Tests successful login flow',
        input: testCredentials.valid,
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.id && response.email === testCredentials.valid.email;
        },
      },
      {
        name: 'Should fail with invalid credentials',
        description: 'Tests invalid credential handling',
        input: testCredentials.invalid,
        expectedStatus: 401,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 401;
        },
      },
      {
        name: 'Should fail with missing email',
        description: 'Tests validation for missing fields',
        input: { password: 'test123' },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 400;
        },
      },
    ],
  },
  {
    name: 'Register',
    method: 'POST',
    path: '/api/auth/register',
    category: 'auth',
    requiresAuth: false,
    testCases: [
      {
        name: 'Should register new user',
        description: 'Tests user registration flow',
        input: testCredentials.newUser,
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.id && response.email === testCredentials.newUser.email;
        },
      },
      {
        name: 'Should fail with existing email',
        description: 'Tests duplicate email handling',
        input: testCredentials.valid,
        expectedStatus: 409,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 409;
        },
      },
      {
        name: 'Should fail with invalid email format',
        description: 'Tests email validation',
        input: { email: 'invalid-email', password: 'Test123!', name: 'Test' },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 400;
        },
      },
    ],
  },
  {
    name: 'Logout',
    method: 'POST',
    path: '/api/auth/logout',
    category: 'auth',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should logout successfully',
        description: 'Tests logout flow',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.success === true || response.message === 'Logged out';
        },
      },
    ],
  },
  {
    name: 'Update Profile',
    method: 'PATCH',
    path: '/api/auth/profile',
    category: 'auth',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should update user profile',
        description: 'Tests profile update functionality',
        input: { name: 'Updated Name', bio: 'Updated bio' },
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.name === 'Updated Name';
        },
      },
      {
        name: 'Should fail when not authenticated',
        description: 'Tests auth requirement',
        input: { name: 'Test' },
        headers: { Cookie: '' },
        expectedStatus: 401,
        shouldFail: true,
        validateResponse: (response) => {
          return response.message === 'Not authenticated';
        },
      },
    ],
  },
];