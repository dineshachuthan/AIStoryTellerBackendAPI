/**
 * Notification API Endpoint Tests
 * Tests email and SMS notification endpoints
 */

import { TestEndpoint } from '../test-config';

export const notificationEndpoints: TestEndpoint[] = [
  {
    name: 'Send Email Notification',
    method: 'POST',
    path: '/api/notifications/email',
    category: 'notification',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should send email notification',
        description: 'Tests SendGrid integration',
        input: {
          to: 'test@example.com',
          subject: 'Test Notification',
          templateId: 'story_invitation',
          data: {
            inviterName: 'Test User',
            storyTitle: 'Test Story',
            invitationLink: 'https://example.com/invite/123',
          },
        },
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.messageId && response.status === 'sent';
        },
      },
      {
        name: 'Should fail with invalid email',
        description: 'Tests email validation',
        input: {
          to: 'invalid-email',
          subject: 'Test',
          templateId: 'story_invitation',
          data: {},
        },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('email');
        },
      },
    ],
  },
  {
    name: 'Send SMS Notification',
    method: 'POST',
    path: '/api/notifications/sms',
    category: 'notification',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should send SMS notification',
        description: 'Tests Twilio integration',
        input: {
          to: '+1234567890',
          message: 'You have been invited to join a collaborative story!',
        },
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.messageId && response.status === 'sent';
        },
      },
      {
        name: 'Should fail with invalid phone',
        description: 'Tests phone validation',
        input: {
          to: 'invalid-phone',
          message: 'Test message',
        },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('phone');
        },
      },
    ],
  },
  {
    name: 'Get Notification Templates',
    method: 'GET',
    path: '/api/notifications/templates',
    category: 'notification',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return email templates',
        description: 'Tests template listing',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            response.every(t => t.id && t.name && t.type);
        },
      },
    ],
  },
  {
    name: 'Get Notification History',
    method: 'GET',
    path: '/api/notifications/history',
    category: 'notification',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return notification history',
        description: 'Tests notification log retrieval',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              response[0].id && response[0].type && response[0].status);
        },
      },
    ],
  },
];