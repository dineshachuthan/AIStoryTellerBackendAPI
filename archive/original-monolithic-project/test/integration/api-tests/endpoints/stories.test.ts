/**
 * Stories API Endpoint Tests
 * Tests all story-related endpoints
 */

import { TestEndpoint } from '../test-config';
import { testData, createTestFormData } from '../test-data';

export const storyEndpoints: TestEndpoint[] = [
  {
    name: 'List Stories',
    method: 'GET',
    path: '/api/stories',
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return user stories',
        description: 'Validates story list response structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) && 
            (response.length === 0 || 
              (response[0].id && response[0].title && response[0].content));
        },
      },
      {
        name: 'Should filter by status',
        description: 'Tests query parameter filtering',
        headers: { Cookie: testData.auth.validSessionCookie },
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) && 
            response.every(story => story.status === 'draft');
        },
      },
    ],
  },
  {
    name: 'Get Story',
    method: 'GET',
    path: `/api/stories/${testData.stories.validStoryId}`,
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return story details',
        description: 'Validates single story response',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.id === testData.stories.validStoryId &&
            response.title && response.content;
        },
      },
      {
        name: 'Should return 404 for non-existent story',
        description: 'Tests invalid story ID handling',
        path: `/api/stories/${testData.stories.invalidStoryId}`,
        expectedStatus: 404,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 404;
        },
      },
    ],
  },
  {
    name: 'Create Story',
    method: 'POST',
    path: '/api/stories',
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should create new story',
        description: 'Tests story creation',
        input: {
          title: 'Test Story',
          content: 'This is a test story about adventure and discovery.',
          storyType: 'text',
          category: 'fiction',
        },
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.id && response.title === 'Test Story' &&
            response.status === 'draft';
        },
      },
      {
        name: 'Should fail without title',
        description: 'Tests validation requirements',
        input: {
          content: 'Story without title',
          storyType: 'text',
          category: 'fiction',
        },
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 400;
        },
      },
    ],
  },
  {
    name: 'Update Story',
    method: 'PATCH',
    path: `/api/stories/${testData.stories.validStoryId}`,
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should update story content',
        description: 'Tests story update functionality',
        input: {
          title: 'Updated Title',
          content: 'Updated content for the story.',
        },
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.title === 'Updated Title';
        },
      },
      {
        name: 'Should fail to update non-owned story',
        description: 'Tests ownership validation',
        path: `/api/stories/${testData.stories.publicStoryId}`,
        input: { title: 'Hacked' },
        headers: { Cookie: 'connect.sid=s%3AanotherUser.signature' },
        expectedStatus: 403,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 403;
        },
      },
    ],
  },
  {
    name: 'Delete Story',
    method: 'DELETE',
    path: `/api/stories/${testData.stories.draftStoryId}`,
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should delete story',
        description: 'Tests story deletion',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.success === true || response.message === 'Story deleted';
        },
      },
      {
        name: 'Should fail to delete published story',
        description: 'Tests business rule enforcement',
        path: `/api/stories/${testData.stories.publicStoryId}`,
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('published');
        },
      },
    ],
  },
  {
    name: 'Analyze Story',
    method: 'POST',
    path: `/api/stories/${testData.stories.validStoryId}/analyze`,
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should analyze story content',
        description: 'Tests AI analysis endpoint',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.characters && Array.isArray(response.characters) &&
            response.emotions && Array.isArray(response.emotions) &&
            response.summary && response.genre;
        },
      },
    ],
  },
  {
    name: 'Upload Audio Story',
    method: 'POST',
    path: '/api/upload-audio',
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should upload audio file',
        description: 'Tests audio upload with transcription',
        input: createTestFormData('audio', { title: 'Audio Story' }),
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.id && response.storyType === 'audio' &&
            response.audioUrl && response.transcription;
        },
      },
      {
        name: 'Should fail with invalid file type',
        description: 'Tests file type validation',
        input: (() => {
          const formData = new FormData();
          const blob = new Blob(['not audio'], { type: 'text/plain' });
          formData.append('audio', blob, 'test.txt');
          return formData;
        })(),
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('audio');
        },
      },
    ],
  },
  {
    name: 'Get Story Filters',
    method: 'GET',
    path: '/api/stories/filters',
    category: 'stories',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return available filters',
        description: 'Tests filter options endpoint',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.genres && Array.isArray(response.genres) &&
            response.categories && Array.isArray(response.categories) &&
            response.moods && Array.isArray(response.moods);
        },
      },
    ],
  },
];