import { promises as fs } from 'fs';
import path from 'path';

// Test the sound pattern update logic
async function testSoundPatternUpdate() {
  console.log('Testing sound pattern update...');
  
  // Simulate sound effects from story analysis
  const soundEffects = [
    {
      sound: 'sea waves crashing',
      intensity: 7,
      context: 'The sea constantly surrounds Stefano',
      quote: 'The waves crashed against the ship'
    },
    {
      sound: 'wind howling',
      intensity: 5,
      context: 'Wind on the deck',
      quote: 'The wind howled across the deck'
    }
  ];
  
  // Load existing patterns
  const soundsPatternsPath = path.join(process.cwd(), 'soundsPattern.json');
  let existingPatterns = [];
  
  try {
    const fileContent = await fs.readFile(soundsPatternsPath, 'utf8');
    existingPatterns = JSON.parse(fileContent);
    console.log('Current patterns:', existingPatterns.length);
  } catch (error) {
    console.log('No existing patterns file');
  }
  
  // Add sea sound pattern
  const seaPattern = {
    pattern: '\\b(sea|ocean|wave(s)?)\\b',
    insert: '(splash splash)'
  };
  
  // Check if pattern exists
  const exists = existingPatterns.some(p => p.pattern === seaPattern.pattern);
  if (!exists) {
    existingPatterns.push(seaPattern);
    console.log('Added sea pattern');
  }
  
  // Save updated patterns
  await fs.writeFile(soundsPatternsPath, JSON.stringify(existingPatterns, null, 2));
  console.log('Updated patterns saved. Total:', existingPatterns.length);
}

testSoundPatternUpdate().catch(console.error);