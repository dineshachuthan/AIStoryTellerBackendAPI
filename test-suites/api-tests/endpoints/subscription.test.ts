/**
 * Subscription API Endpoint Tests
 * Tests all subscription and payment-related endpoints
 */

import { TestEndpoint } from '../test-config';

export const subscriptionEndpoints: TestEndpoint[] = [
  {
    name: 'Get Subscription Plans',
    method: 'GET',
    path: '/api/subscription/plans',
    category: 'subscription',
    requiresAuth: false,
    testCases: [
      {
        name: 'Should return available plans',
        description: 'Validates subscription plan structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            response.length > 0 &&
            response.every(plan => 
              plan.id && plan.name && plan.price !== undefined &&
              plan.features && Array.isArray(plan.features)
            );
        },
      },
    ],
  },
  {
    name: 'Get Current Subscription',
    method: 'GET',
    path: '/api/subscription/current',
    category: 'subscription',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return user subscription',
        description: 'Tests current subscription retrieval',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.planId && response.status &&
            response.startDate && response.features;
        },
      },
    ],
  },
  {
    name: 'Subscribe to Plan',
    method: 'POST',
    path: '/api/subscription/subscribe',
    category: 'subscription',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should create subscription',
        description: 'Tests subscription creation',
        input: { planId: 'gold' },
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.subscriptionId && 
            response.status === 'active' &&
            response.planId === 'gold';
        },
      },
      {
        name: 'Should fail with invalid plan',
        description: 'Tests plan validation',
        input: { planId: 'invalid_plan' },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('plan');
        },
      },
    ],
  },
  {
    name: 'Cancel Subscription',
    method: 'POST',
    path: '/api/subscription/cancel',
    category: 'subscription',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should cancel subscription',
        description: 'Tests subscription cancellation',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.status === 'cancelled' &&
            response.endDate;
        },
      },
      {
        name: 'Should fail without active subscription',
        description: 'Tests no subscription handling',
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('subscription');
        },
      },
    ],
  },
  {
    name: 'Get Usage Stats',
    method: 'GET',
    path: '/api/subscription/usage',
    category: 'subscription',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return usage statistics',
        description: 'Tests usage tracking endpoint',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.storiesCreated !== undefined &&
            response.storiesLimit !== undefined &&
            response.videosGenerated !== undefined &&
            response.voiceSamples !== undefined;
        },
      },
    ],
  },
];