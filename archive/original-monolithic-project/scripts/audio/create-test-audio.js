#!/usr/bin/env node

// Create a test audio file with clear speech content for OpenAI testing
import fs from 'fs';
import { execSync } from 'child_process';

async function createTestAudioFile() {
  console.log('Creating test audio file with clear speech...');
  
  // Create a simple text-to-speech test file using espeak if available
  try {
    // Test if espeak is available
    execSync('which espeak', { stdio: 'ignore' });
    
    const testText = "Hello, this is a test recording for OpenAI Whisper transcription. The quick brown fox jumps over the lazy dog.";
    
    console.log('Using espeak to generate test audio...');
    console.log('Text to speak:', testText);
    
    // Generate WAV file with espeak
    execSync(`espeak "${testText}" -w test-generated.wav -s 150`, { stdio: 'inherit' });
    
    console.log('Test audio file created: test-generated.wav');
    
    // Check file size
    const stats = fs.statSync('test-generated.wav');
    console.log(`File size: ${stats.size} bytes`);
    
    return 'test-generated.wav';
    
  } catch (error) {
    console.log('espeak not available, will use existing audio files');
    return null;
  }
}

// Also create a simple test with known speech content
async function testKnownAudio() {
  const { transcribeAudio } = await import('./server/ai-analysis.ts');
  
  // First try to create a test file
  const testFile = await createTestAudioFile();
  
  if (testFile && fs.existsSync(testFile)) {
    console.log(`\n--- Testing generated audio file: ${testFile} ---`);
    
    const audioBuffer = fs.readFileSync(testFile);
    console.log(`Buffer size: ${audioBuffer.length} bytes`);
    
    try {
      const result = await transcribeAudio(audioBuffer);
      console.log('✅ Transcription result:', JSON.stringify(result));
      console.log('Length:', result.length, 'characters');
      
      // Clean up
      fs.unlinkSync(testFile);
      console.log('Test file cleaned up');
      
    } catch (error) {
      console.log('❌ Transcription failed:', error.message);
      // Clean up on error too
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }
  } else {
    console.log('Could not create test audio file, skipping generated audio test');
  }
}

testKnownAudio().catch(console.error);