#!/usr/bin/env node

// Test OpenAI transcription with various audio content types
import fs from 'fs';

async function testPublicAudioSample() {
  console.log('=== Testing OpenAI Transcription with Sample Files ===\n');
  
  const { transcribeAudio } = await import('./server/ai-analysis.ts');
  
  // Test 1: Check what's in our downloaded file
  if (fs.existsSync('test-sample.wav')) {
    console.log('--- Testing downloaded sample file ---');
    const stats = fs.statSync('test-sample.wav');
    console.log(`File size: ${stats.size} bytes`);
    
    const buffer = fs.readFileSync('test-sample.wav');
    console.log(`Buffer size: ${buffer.length} bytes`);
    console.log(`File header: ${buffer.subarray(0, 12).toString('hex')}`);
    
    try {
      const result = await transcribeAudio(buffer);
      console.log('✅ Sample file transcription:', JSON.stringify(result));
    } catch (error) {
      console.log('❌ Sample file failed:', error.message);
    }
  }
  
  // Test 2: Test with existing files but temporarily disable the length check
  const originalTranscribe = (await import('./server/ai-analysis.ts')).transcribeAudio;
  
  // Create a version without length validation for testing
  async function testTranscribeWithoutValidation(audioBuffer) {
    const tempModule = await import('./server/ai-analysis.ts');
    const openai = new (await import('openai')).default({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
    
    const tempFilePath = `/tmp/test_audio_${Date.now()}.webm`;
    await fs.promises.writeFile(tempFilePath, audioBuffer);
    
    try {
      const audioReadStream = fs.createReadStream(tempFilePath);
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
      });
      
      console.log('Raw OpenAI response without validation:', JSON.stringify(transcription, null, 2));
      return transcription.text;
    } finally {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    }
  }
  
  // Test existing files without length validation
  const existingFiles = [
    'uploads/voice/voice_google_117487073695002443567_happy_1751050270724.wav'
  ];
  
  for (const filePath of existingFiles) {
    if (fs.existsSync(filePath)) {
      console.log(`\n--- Testing ${filePath} without validation ---`);
      const buffer = fs.readFileSync(filePath);
      
      try {
        const result = await testTranscribeWithoutValidation(buffer);
        console.log('Raw transcription result:', JSON.stringify(result));
        console.log('Length:', result.length);
        console.log('Is mostly silence?', result.trim().length < 10);
      } catch (error) {
        console.log('Error:', error.message);
      }
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testPublicAudioSample().catch(console.error);