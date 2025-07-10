/**
 * Test Data for API Endpoint Testing
 * Contains hardcoded sample values from the database
 * Can be refreshed using the test-data-generator.ts script
 */

import { TestData } from './test-config';

export const testData: TestData = {
  auth: {
    validSessionCookie: 'session=test-session-cookie',
  },
  users: {
    validUserId: 'google_117487073695002443567',
    invalidUserId: 'invalid_user_12345',
    testEmail: 'test@example.com',
  },
  stories: {
    validStoryId: 75, // The Janitor's Name
    invalidStoryId: 99999,
    draftStoryId: 75,
    publicStoryId: 75,
  },
  roleplay: {
    validTemplateId: 1,
    validInvitationToken: 'test_invitation_token',
  },
  voice: {
    validVoiceId: 'cuxbYT1nu3MZbK8JwgAZ',
    validEmotion: 'hope',
  },
};

// Mock authentication cookies for testing
export const testAuth = {
  validSessionCookie: 'connect.sid=s%3AvalidSessionId.signature',
  invalidSessionCookie: 'connect.sid=s%3AinvalidSessionId.signature',
};

// Sample form data for file uploads
export const testFormData = {
  audioFile: {
    filename: 'test-sample.mp3',
    contentType: 'audio/mp3',
    buffer: Buffer.from('mock audio data'), // In real tests, use actual audio file
  },
  storyFile: {
    filename: 'test-story.txt',
    contentType: 'text/plain',
    content: 'This is a test story about hope and determination.',
  },
};

// Expected response structures for validation
export const expectedResponses = {
  user: {
    id: 'string',
    email: 'string',
    name: 'string',
    avatar: 'string',
    createdAt: 'string',
  },
  story: {
    id: 'number',
    title: 'string',
    content: 'string',
    status: 'string',
    userId: 'string',
    createdAt: 'string',
    updatedAt: 'string',
  },
  character: {
    id: 'number',
    name: 'string',
    description: 'string',
    personality: 'string',
    appearance: 'string',
    assignedVoice: 'string',
  },
  narration: {
    segments: 'array',
    totalDuration: 'number',
    voice: 'string',
    voiceType: 'string',
  },
};

// Helper to create FormData for testing
export function createTestFormData(type: 'audio' | 'story', additionalFields?: Record<string, any>): FormData {
  const formData = new FormData();
  
  if (type === 'audio') {
    const blob = new Blob([testFormData.audioFile.buffer], { type: testFormData.audioFile.contentType });
    formData.append('audio', blob, testFormData.audioFile.filename);
  } else {
    const blob = new Blob([testFormData.storyFile.content], { type: testFormData.storyFile.contentType });
    formData.append('file', blob, testFormData.storyFile.filename);
  }
  
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
    });
  }
  
  return formData;
}

// Test user credentials for auth testing
export const testCredentials = {
  valid: {
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  newUser: {
    email: 'newuser@example.com',
    password: 'NewUser123!',
    name: 'Test User',
  },
};