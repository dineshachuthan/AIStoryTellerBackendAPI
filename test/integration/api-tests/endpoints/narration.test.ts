/**
 * Narration API Endpoint Tests
 * Tests all narration and voice-related endpoints
 */

import { TestEndpoint } from '../test-config';
import { testData } from '../test-data';

export const narrationEndpoints: TestEndpoint[] = [
  {
    name: 'Generate Story Narration',
    method: 'POST',
    path: `/api/stories/${testData.stories.validStoryId}/generate-narration`,
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should generate narration segments',
        description: 'Tests ElevenLabs narration generation',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.segments && Array.isArray(response.segments) &&
            response.segments.length > 0 &&
            response.segments[0].audioUrl &&
            response.voice && response.voiceType;
        },
      },
      {
        name: 'Should fail for story without content',
        description: 'Tests empty content validation',
        path: `/api/stories/${testData.stories.draftStoryId}/generate-narration`,
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 400;
        },
      },
    ],
  },
  {
    name: 'Play Story Narration',
    method: 'GET',
    path: `/api/stories/${testData.stories.validStoryId}/play`,
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return narration segments',
        description: 'Tests narration playback endpoint',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.segments && Array.isArray(response.segments) &&
            response.segments.every(s => s.audioUrl && s.duration);
        },
      },
      {
        name: 'Should return 404 for non-narrated story',
        description: 'Tests missing narration handling',
        path: `/api/stories/${testData.stories.draftStoryId}/play`,
        expectedStatus: 404,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('narration');
        },
      },
    ],
  },
  {
    name: 'Get Voice Samples',
    method: 'GET',
    path: '/api/voice/samples',
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return user voice samples',
        description: 'Tests voice sample listing',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || response[0].emotion);
        },
      },
    ],
  },
  {
    name: 'Record Voice Sample',
    method: 'POST',
    path: '/api/voice/record',
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should save voice recording',
        description: 'Tests voice sample upload',
        input: (() => {
          const formData = new FormData();
          const audioBlob = new Blob(['mock audio data'], { type: 'audio/mp3' });
          formData.append('audio', audioBlob, 'voice-sample.mp3');
          formData.append('emotion', testData.voice.validEmotion);
          formData.append('category', '1');
          formData.append('duration', '15.5');
          return formData;
        })(),
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.id && response.audioUrl && response.emotion === testData.voice.validEmotion;
        },
      },
      {
        name: 'Should reject short recordings',
        description: 'Tests duration validation',
        input: (() => {
          const formData = new FormData();
          const audioBlob = new Blob(['short'], { type: 'audio/mp3' });
          formData.append('audio', audioBlob, 'short.mp3');
          formData.append('emotion', 'test');
          formData.append('category', '1');
          formData.append('duration', '3.0');
          return formData;
        })(),
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('duration');
        },
      },
    ],
  },
  {
    name: 'Generate Narrator Voice',
    method: 'POST',
    path: '/api/voice/generate-narrator',
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should generate ElevenLabs narrator voice',
        description: 'Tests voice cloning integration',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.voiceId && response.status === 'completed';
        },
      },
      {
        name: 'Should fail with insufficient samples',
        description: 'Tests minimum sample requirement',
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('samples');
        },
      },
    ],
  },
  {
    name: 'Get ESM Recordings',
    method: 'GET',
    path: '/api/user/esm-recordings',
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return all user ESM recordings',
        description: 'Tests ESM recording listing',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].emotion && response[0].storyTitle && response[0].duration));
        },
      },
    ],
  },
  {
    name: 'Get ESM Templates',
    method: 'GET',
    path: `/api/voice/esm-templates/${testData.stories.validStoryId}`,
    category: 'narration',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return story ESM templates',
        description: 'Tests ESM template generation',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.emotions && Array.isArray(response.emotions) &&
            response.sounds && Array.isArray(response.sounds) &&
            response.modulations && Array.isArray(response.modulations);
        },
      },
    ],
  },
];