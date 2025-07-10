#!/usr/bin/env node

// Detailed audio analysis to understand transcription behavior
import fs from 'fs';
import path from 'path';

// Find all audio files
const findAudioFiles = (dir, files = []) => {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          findAudioFiles(fullPath, files);
        } else if (item.match(/\.(wav|webm|mp3|m4a|ogg|flac)$/i)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      console.log(`Error reading directory ${dir}: ${error.message}`);
    }
    return files;
  };

async function analyzeAudioFiles() {
  console.log('=== Detailed Audio Analysis ===\n');
  
  // Check multiple locations for audio files
  const searchDirs = ['./uploads', '/tmp'];
  let allAudioFiles = [];
  
  for (const dir of searchDirs) {
    console.log(`Checking directory: ${dir}`);
    if (fs.existsSync(dir)) {
      const files = findAudioFiles(dir);
      console.log(`Found ${files.length} audio files in ${dir}`);
      allAudioFiles = allAudioFiles.concat(files);
    } else {
      console.log(`Directory ${dir} does not exist`);
    }
  }
  
  console.log(`\nTotal audio files found: ${allAudioFiles.length}`);
  
  const { transcribeAudio } = await import('./server/ai-analysis.ts');
  
  for (const audioFile of allAudioFiles) {
    console.log(`\n--- Analyzing: ${audioFile} ---`);
    
    const stat = fs.statSync(audioFile);
    console.log(`File size: ${stat.size} bytes (${(stat.size / 1024).toFixed(2)} KB)`);
    console.log(`Created: ${stat.birthtime}`);
    console.log(`Modified: ${stat.mtime}`);
    
    const audioBuffer = fs.readFileSync(audioFile);
    console.log(`Buffer length: ${audioBuffer.length}`);
    
    // Check file format by looking at first few bytes
    const header = audioBuffer.subarray(0, 12);
    console.log(`File header (hex): ${header.toString('hex')}`);
    console.log(`File header (ascii): ${header.toString('ascii').replace(/[^\x20-\x7E]/g, '.')}`);
    
    try {
      console.log('Starting transcription...');
      const result = await transcribeAudio(audioBuffer);
      console.log(`✅ Transcription successful: "${result}"`);
      console.log(`Text length: ${result.length} characters`);
      
      if (result.length === 0) {
        console.log('⚠️  Empty transcription result');
      } else if (result.length < 10) {
        console.log('⚠️  Very short transcription result');
      }
      
    } catch (error) {
      console.log(`❌ Transcription failed: ${error.message}`);
    }
  }
  
  console.log('\n=== Analysis Complete ===');
}

analyzeAudioFiles().catch(console.error);