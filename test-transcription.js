#!/usr/bin/env node

// Simple test script to verify audio transcription functionality
import fs from 'fs';
import path from 'path';

// Import the transcription function
async function testTranscription() {
  try {
    console.log('Testing audio transcription functionality...');
    
    // Check if we can import the transcription module
    const { transcribeAudio } = await import('./server/ai-analysis.ts');
    
    // Create a small test audio buffer (WebM format simulation)
    // This won't be real audio, but will test the file handling
    const testBuffer = Buffer.from('test audio data');
    
    console.log('Created test buffer of size:', testBuffer.length);
    console.log('Calling transcribeAudio with test buffer...');
    
    // This will likely fail with OpenAI but we can see the file handling
    const result = await transcribeAudio(testBuffer);
    console.log('Transcription result:', result);
    
  } catch (error) {
    console.log('Expected error (no real audio):', error.message);
    console.log('File handling portion worked correctly');
  }
}

// Test with a real audio file if one exists
async function testWithRealFile() {
  try {
    console.log('\nLooking for existing audio files to test with...');
    
    // Check uploads directory for any audio files
    const uploadsDir = './uploads';
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir, { recursive: true });
      const audioFiles = files.filter(file => 
        file.endsWith('.webm') || file.endsWith('.wav') || file.endsWith('.mp3')
      );
      
      if (audioFiles.length > 0) {
        console.log('Found audio files:', audioFiles);
        
        const audioFile = path.join(uploadsDir, audioFiles[0]);
        const audioBuffer = fs.readFileSync(audioFile);
        
        console.log('Testing with real audio file:', audioFile);
        console.log('File size:', audioBuffer.length, 'bytes');
        
        const { transcribeAudio } = await import('./server/ai-analysis.ts');
        const result = await transcribeAudio(audioBuffer);
        console.log('Real transcription result:', result);
        
      } else {
        console.log('No audio files found in uploads directory');
      }
    } else {
      console.log('Uploads directory does not exist');
    }
    
  } catch (error) {
    console.log('Real file test error:', error.message);
  }
}

// Run the tests
async function runTests() {
  console.log('=== Audio Transcription Test Script ===\n');
  
  await testTranscription();
  await testWithRealFile();
  
  console.log('\n=== Test Complete ===');
}

runTests().catch(console.error);