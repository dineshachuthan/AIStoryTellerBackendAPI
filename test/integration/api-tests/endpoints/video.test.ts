/**
 * Video Generation API Endpoint Tests
 * Tests all video-related endpoints
 */

import { TestEndpoint } from '../test-config';
import { testData } from '../test-data';

export const videoEndpoints: TestEndpoint[] = [
  {
    name: 'Generate Video',
    method: 'POST',
    path: `/api/video/generate/${testData.roleplay.validTemplateId}`,
    category: 'video',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should start video generation',
        description: 'Tests video generation initiation',
        input: {
          quality: 'standard',
          duration: 30,
          provider: 'runwayml',
        },
        expectedStatus: 202,
        validateResponse: (response) => {
          return response.jobId && response.status === 'processing' &&
            response.provider && response.estimatedTime;
        },
      },
      {
        name: 'Should fail without completed roleplay',
        description: 'Tests roleplay completion requirement',
        path: `/api/video/generate/99999`,
        input: { quality: 'standard' },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('roleplay');
        },
      },
      {
        name: 'Should enforce duration limits',
        description: 'Tests duration validation',
        input: {
          quality: 'premium',
          duration: 300, // 5 minutes
        },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('duration');
        },
      },
    ],
  },
  {
    name: 'Get Video Status',
    method: 'GET',
    path: '/api/video/status/1',
    category: 'video',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return video generation status',
        description: 'Tests status polling endpoint',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.status && 
            ['pending', 'processing', 'completed', 'failed'].includes(response.status) &&
            (response.status === 'completed' ? response.videoUrl : true);
        },
      },
      {
        name: 'Should return 404 for invalid job',
        description: 'Tests invalid job ID handling',
        path: '/api/video/status/99999',
        expectedStatus: 404,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 404;
        },
      },
    ],
  },
  {
    name: 'List Video Generations',
    method: 'GET',
    path: '/api/video/generations',
    category: 'video',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return user video generations',
        description: 'Tests video history listing',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].status && response[0].templateId));
        },
      },
    ],
  },
  {
    name: 'Get Video Providers',
    method: 'GET',
    path: '/api/video/providers',
    category: 'video',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return available providers',
        description: 'Tests provider listing',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            response.every(p => p.id && p.name && p.status);
        },
      },
    ],
  },
];