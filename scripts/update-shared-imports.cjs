#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Mapping of old imports to new imports
const importMappings = {
  // Schema files
  '@shared/schema': '@shared/schema/schema',
  '@shared/reference-schema': '@shared/schema/reference-schema',
  '@shared/roleplay-schema': '@shared/schema/roleplay-schema',
  
  // Config files
  '@shared/audio-config': '@shared/config/audio-config',
  '@shared/audioConfig': '@shared/config/audioConfig',
  '@shared/collaborative-config': '@shared/config/collaborative-config',
  '@shared/draft-config': '@shared/config/draft-config',
  '@shared/ephemeral-voice-config': '@shared/config/ephemeral-voice-config',
  '@shared/global-voice-samples-config': '@shared/config/global-voice-samples-config',
  '@shared/i18n-config': '@shared/config/i18n-config',
  '@shared/language-config': '@shared/config/language-config',
  '@shared/roleplay-config': '@shared/config/roleplay-config',
  '@shared/state-config': '@shared/config/state-config',
  '@shared/storyConfig': '@shared/config/storyConfig',
  '@shared/video-format-config': '@shared/config/video-format-config',
  '@shared/voice-config': '@shared/config/voice-config',
  '@shared/voice-recording-config': '@shared/config/voice-recording-config',
  
  // Types files
  '@shared/api-response': '@shared/types/api-response',
  '@shared/api-types': '@shared/types/api-types',
  '@shared/audio-types': '@shared/types/audio-types',
  '@shared/types': '@shared/types/types',
  '@shared/userSession': '@shared/types/userSession',
  '@shared/voice-gamification-types': '@shared/types/voice-gamification-types',
  
  // Utils files
  '@shared/i18n-hierarchical': '@shared/utils/i18n-hierarchical',
  '@shared/state-manager': '@shared/utils/state-manager',
  
  // Constants files
  '@shared/storyGenres': '@shared/constants/storyGenres',
  '@shared/world-languages': '@shared/constants/world-languages',
};

// Function to find all files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist, build
      if (!['node_modules', '.next', 'dist', 'build', '.git'].includes(file)) {
        findFiles(filePath, fileList);
      }
    } else {
      // Process TypeScript and JavaScript files
      if (/\.(ts|tsx|js|jsx)$/.test(file) && !filePath.includes('update-shared-imports.js')) {
        fileList.push(filePath);
      }
    }
  });
  
  return fileList;
}

// Find all files
const files = findFiles('.');
console.log(`Found ${files.length} files to process`);

let totalReplacements = 0;
let updatedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let modified = false;
  
  Object.entries(importMappings).forEach(([oldImport, newImport]) => {
    // Create regex that matches the old import
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`from ['"]${escapeRegex(oldImport)}['"]`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, `from '${newImport}'`);
      modified = true;
      totalReplacements++;
    }
  });
  
  if (modified) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${file}`);
    updatedFiles++;
  }
});

console.log(`\nComplete! Updated ${totalReplacements} imports in ${updatedFiles} files`);