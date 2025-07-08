/**
 * Collaborative Roleplay API Endpoint Tests
 * Tests all roleplay and invitation endpoints
 */

import { TestEndpoint } from '../test-config';
import { testData } from '../test-data';

export const roleplayEndpoints: TestEndpoint[] = [
  {
    name: 'Get Roleplay Templates',
    method: 'GET',
    path: '/api/roleplay/templates',
    category: 'roleplay',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return user roleplay templates',
        description: 'Validates template list structure',
        expectedStatus: 200,
        validateResponse: (response) => {
          return Array.isArray(response) &&
            (response.length === 0 || 
              (response[0].id && response[0].storyId && response[0].scenes));
        },
      },
    ],
  },
  {
    name: 'Create Roleplay Template',
    method: 'POST',
    path: `/api/roleplay/templates/${testData.stories.validStoryId}`,
    category: 'roleplay',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should create template from story',
        description: 'Tests template creation from analyzed story',
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.id && response.storyId === testData.stories.validStoryId &&
            response.scenes && Array.isArray(response.scenes) &&
            response.characters && Array.isArray(response.characters);
        },
      },
      {
        name: 'Should fail for unanalyzed story',
        description: 'Tests analysis requirement',
        path: `/api/roleplay/templates/${testData.stories.draftStoryId}`,
        expectedStatus: 400,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('analysis');
        },
      },
    ],
  },
  {
    name: 'Get Roleplay Template',
    method: 'GET',
    path: `/api/roleplay/templates/${testData.roleplay.validTemplateId}`,
    category: 'roleplay',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return template details',
        description: 'Tests single template retrieval',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.id === testData.roleplay.validTemplateId &&
            response.scenes && response.characters &&
            response.invitations && Array.isArray(response.invitations);
        },
      },
      {
        name: 'Should return 404 for non-existent template',
        description: 'Tests invalid template handling',
        path: '/api/roleplay/templates/99999',
        expectedStatus: 404,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.code === 404;
        },
      },
    ],
  },
  {
    name: 'Create Roleplay Invitation',
    method: 'POST',
    path: `/api/roleplay/templates/${testData.roleplay.validTemplateId}/invitations`,
    category: 'roleplay',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should create email invitation',
        description: 'Tests email invitation creation',
        input: {
          participantName: 'Test User',
          participantEmail: 'invitee@example.com',
          characterId: 1,
          message: 'Please join my roleplay!',
        },
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.invitationToken && 
            response.participantEmail === 'invitee@example.com' &&
            response.status === 'sent';
        },
      },
      {
        name: 'Should create SMS invitation',
        description: 'Tests SMS invitation creation',
        input: {
          participantName: 'SMS User',
          participantPhone: '+1234567890',
          characterId: 1,
          message: 'Join my story!',
        },
        expectedStatus: 201,
        validateResponse: (response) => {
          return response.invitationToken && 
            response.participantPhone === '+1234567890';
        },
      },
      {
        name: 'Should fail without contact info',
        description: 'Tests validation requirements',
        input: {
          participantName: 'No Contact',
          characterId: 1,
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
    name: 'Submit Roleplay Recording',
    method: 'POST',
    path: `/api/roleplay/invitations/${testData.roleplay.validInvitationToken}/submit`,
    category: 'roleplay',
    requiresAuth: false, // Guest users can submit
    testCases: [
      {
        name: 'Should submit character recording',
        description: 'Tests recording submission',
        input: (() => {
          const formData = new FormData();
          const audioBlob = new Blob(['character voice'], { type: 'audio/mp3' });
          formData.append('audio', audioBlob, 'character.mp3');
          formData.append('sceneId', '1');
          formData.append('duration', '30.5');
          return formData;
        })(),
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.submissionId && response.status === 'submitted';
        },
      },
      {
        name: 'Should fail with expired token',
        description: 'Tests token expiration',
        path: '/api/roleplay/invitations/expired_token/submit',
        input: new FormData(),
        expectedStatus: 404,
        shouldFail: true,
        validateResponse: (response) => {
          return response.error && response.error.message.includes('invitation');
        },
      },
    ],
  },
  {
    name: 'Get Story Roleplay Analysis',
    method: 'GET',
    path: `/api/stories/${testData.stories.validStoryId}/roleplay`,
    category: 'roleplay',
    requiresAuth: true,
    testCases: [
      {
        name: 'Should return roleplay analysis',
        description: 'Tests roleplay analysis retrieval',
        expectedStatus: 200,
        validateResponse: (response) => {
          return response.scenes && Array.isArray(response.scenes) &&
            response.characters && Array.isArray(response.characters) &&
            response.dialogues && Array.isArray(response.dialogues);
        },
      },
    ],
  },
];