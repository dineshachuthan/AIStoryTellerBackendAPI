/**
 * Test Data Generator
 * Pulls fresh test data from the database to update test-data.ts
 * Run with: npm run generate-test-data
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

interface TestDataSnapshot {
  generatedAt: string;
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

async function generateTestData(): Promise<void> {
  console.log('🔄 Generating fresh test data from database...');
  
  try {
    // Get a valid user
    const users = await db.select().from(schema.users).limit(1);
    const validUser = users[0];
    
    if (!validUser) {
      throw new Error('No users found in database');
    }
    
    console.log(`✅ Found user: ${validUser.id}`);
    
    // Get stories
    const stories = await db.select()
      .from(schema.stories)
      .where(eq(schema.stories.userId, validUser.id))
      .orderBy(desc(schema.stories.createdAt))
      .limit(10);
    
    const draftStory = stories.find(s => s.status === 'draft');
    const publicStory = stories.find(s => s.status === 'published') || stories[0];
    
    console.log(`✅ Found ${stories.length} stories`);
    
    // Get roleplay templates
    const templates = await db.select()
      .from(schema.roleplayTemplates)
      .limit(1);
    
    const validTemplate = templates[0];
    
    // Get invitations
    const invitations = await db.select()
      .from(schema.roleplayInvitations)
      .limit(1);
    
    const validInvitation = invitations[0];
    
    // Get voice data
    const userEsm = await db.select()
      .from(schema.userEsm)
      .where(eq(schema.userEsm.userId, validUser.id))
      .limit(1);
    
    const voiceData = userEsm[0];
    
    // Get ESM recordings
    const recordings = await db.select()
      .from(schema.userEsmRecordings)
      .where(eq(schema.userEsmRecordings.userId, validUser.id))
      .limit(5);
    
    const validEmotion = recordings[0]?.emotion || 'hope';
    
    // Create test data snapshot
    const testDataSnapshot: TestDataSnapshot = {
      generatedAt: new Date().toISOString(),
      users: {
        validUserId: validUser.id,
        invalidUserId: 'invalid_user_' + Math.random().toString(36).substring(7),
        testEmail: validUser.email,
      },
      stories: {
        validStoryId: publicStory?.id || 1,
        invalidStoryId: 99999,
        draftStoryId: draftStory?.id || publicStory?.id || 1,
        publicStoryId: publicStory?.id || 1,
      },
      roleplay: {
        validTemplateId: validTemplate?.id || 1,
        validInvitationToken: validInvitation?.invitationToken || 'test_token',
      },
      voice: {
        validVoiceId: voiceData?.narratorVoiceId || 'test_voice_id',
        validEmotion: validEmotion,
      },
    };
    
    // Generate TypeScript file content
    const fileContent = `/**
 * Test Data for API Endpoint Testing
 * Generated at: ${testDataSnapshot.generatedAt}
 * Contains hardcoded sample values from the database
 * Can be refreshed using: npm run generate-test-data
 */

import { TestData } from './test-config';

export const testData: TestData = ${JSON.stringify(testDataSnapshot, null, 2)};

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
    id: expect.any(String),
    email: expect.any(String),
    name: expect.any(String),
    avatar: expect.any(String),
    createdAt: expect.any(String),
  },
  story: {
    id: expect.any(Number),
    title: expect.any(String),
    content: expect.any(String),
    status: expect.any(String),
    userId: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  },
  character: {
    id: expect.any(Number),
    name: expect.any(String),
    description: expect.any(String),
    personality: expect.any(String),
    appearance: expect.any(String),
    assignedVoice: expect.any(String),
  },
  narration: {
    segments: expect.any(Array),
    totalDuration: expect.any(Number),
    voice: expect.any(String),
    voiceType: expect.any(String),
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
};`;
    
    // Write to file
    const outputPath = path.join(process.cwd(), 'test-suites', 'api-tests', 'test-data.ts');
    await fs.writeFile(outputPath, fileContent, 'utf-8');
    
    console.log('✅ Test data generated successfully!');
    console.log(`📁 Written to: ${outputPath}`);
    console.log('\n📊 Summary:');
    console.log(`  - User ID: ${testDataSnapshot.users.validUserId}`);
    console.log(`  - Stories: ${stories.length} found`);
    console.log(`  - Valid Story ID: ${testDataSnapshot.stories.validStoryId}`);
    console.log(`  - Voice ID: ${testDataSnapshot.voice.validVoiceId}`);
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTestData();
}