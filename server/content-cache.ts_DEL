import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import https from 'https';
import http from 'http';
import { getStorageConfig, getPublicUrl } from './storage-config';

// Get environment-specific storage configuration
const storageConfig = getStorageConfig();
const { cacheDir, imagesDir, audioDir, metadataDir } = storageConfig;

// Ensure all cache directories exist
[cacheDir, imagesDir, audioDir, metadataDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

console.log(`[Storage] Environment: ${storageConfig.environment}`);
console.log(`[Storage] Cache directory: ${cacheDir}`);
console.log(`[Storage] Max cache size: ${storageConfig.maxCacheSizeMB}MB`);
console.log(`[Storage] Max file age: ${storageConfig.maxFileAgeDays} days`);

// Types for cached content
interface CachedImage {
  id: string;
  character: any;
  storyContext: string;
  originalUrl: string;
  localPath: string;
  timestamp: number;
  fileSize: number;
}

interface CachedAudio {
  id: string;
  text: string;
  voice: string;
  emotion?: string;
  intensity?: number;
  originalUrl: string;
  localPath: string;
  timestamp: number;
  fileSize: number;
}

interface CachedAnalysis {
  id: string;
  content: string;
  analysis: any;
  timestamp: number;
}

// Generate unique content hash
function generateContentHash(data: any): string {
  const contentString = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(contentString).digest('hex');
}

// Download and save file locally
async function downloadFile(url: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(localPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlinkSync(localPath);
        reject(err);
      });
    }).on('error', reject);
  });
}

// IMAGE CACHING FUNCTIONS

export function getCachedCharacterImage(character: any, storyContext: string): string | null {
  const hash = generateContentHash({
    name: character.name,
    description: character.description,
    personality: character.personality,
    role: character.role,
    appearance: character.appearance,
    traits: character.traits,
    context: storyContext.substring(0, 200)
  });

  const metadataPath = path.join(metadataDir, `image_${hash}.json`);
  
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata: CachedImage = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check if local file still exists
      if (fs.existsSync(metadata.localPath)) {
        // Check age (30 days max)
        const age = Date.now() - metadata.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        
        if (age < maxAge) {
          console.log(`Using cached image for character: ${character.name}`);
          // Return the original OpenAI URL, not the local path
          return metadata.originalUrl;
        }
      }
      
      // Clean up invalid cache
      fs.unlinkSync(metadataPath);
      if (fs.existsSync(metadata.localPath)) {
        fs.unlinkSync(metadata.localPath);
      }
    } catch (error) {
      console.error('Error reading image cache:', error);
    }
  }
  
  return null;
}

export async function cacheCharacterImage(character: any, storyContext: string, imageUrl: string): Promise<void> {
  const hash = generateContentHash({
    name: character.name,
    description: character.description,
    personality: character.personality,
    role: character.role,
    appearance: character.appearance,
    traits: character.traits,
    context: storyContext.substring(0, 200)
  });

  const filename = `${hash}.png`;
  const localPath = path.join(imagesDir, filename);
  const metadataPath = path.join(metadataDir, `image_${hash}.json`);

  try {
    // Download and save the image locally
    await downloadFile(imageUrl, localPath);
    
    // Get file size
    const stats = fs.statSync(localPath);
    
    // Save metadata
    const metadata: CachedImage = {
      id: hash,
      character: {
        name: character.name,
        description: character.description,
        personality: character.personality,
        role: character.role
      },
      storyContext: storyContext.substring(0, 200),
      originalUrl: imageUrl,
      localPath,
      timestamp: Date.now(),
      fileSize: stats.size
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Cached image locally for character: ${character.name} (${Math.round(stats.size / 1024)}KB)`);
  } catch (error) {
    console.error('Error caching image:', error);
  }
}

// AUDIO CACHING FUNCTIONS

export function getCachedAudio(text: string, voice: string, emotion?: string, intensity?: number): string | null {
  const hash = generateContentHash({
    text: text.trim(),
    voice,
    emotion,
    intensity
  });

  const metadataPath = path.join(metadataDir, `audio_${hash}.json`);
  
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata: CachedAudio = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check if local file still exists
      if (fs.existsSync(metadata.localPath)) {
        // Check age (30 days max)
        const age = Date.now() - metadata.timestamp;
        const maxAge = 30 * 24 * 60 * 60 * 1000;
        
        if (age < maxAge) {
          console.log(`Using cached audio for text: "${text.substring(0, 50)}..."`);
          // Return the original URL, not the local path
          return metadata.originalUrl;
        }
      }
      
      // Clean up invalid cache
      fs.unlinkSync(metadataPath);
      if (fs.existsSync(metadata.localPath)) {
        fs.unlinkSync(metadata.localPath);
      }
    } catch (error) {
      console.error('Error reading audio cache:', error);
    }
  }
  
  return null;
}

export async function cacheAudio(text: string, voice: string, audioUrl: string, emotion?: string, intensity?: number): Promise<void> {
  const hash = generateContentHash({
    text: text.trim(),
    voice,
    emotion,
    intensity
  });

  const filename = `${hash}.mp3`;
  const localPath = path.join(audioDir, filename);
  const metadataPath = path.join(metadataDir, `audio_${hash}.json`);

  try {
    // Download and save the audio locally
    await downloadFile(audioUrl, localPath);
    
    // Get file size
    const stats = fs.statSync(localPath);
    
    // Save metadata
    const metadata: CachedAudio = {
      id: hash,
      text: text.trim(),
      voice,
      emotion,
      intensity,
      originalUrl: audioUrl,
      localPath,
      timestamp: Date.now(),
      fileSize: stats.size
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Cached audio locally for text: "${text.substring(0, 30)}..." (${Math.round(stats.size / 1024)}KB)`);
  } catch (error) {
    console.error('Error caching audio:', error);
  }
}

// CACHE MANAGEMENT FUNCTIONS

export function getAllCacheStats(): { 
  images: { count: number; totalSizeKB: number }; 
  audio: { count: number; totalSizeKB: number };
  total: { count: number; totalSizeKB: number };
} {
  try {
    const imageFiles = fs.readdirSync(imagesDir).filter(f => f.endsWith('.png'));
    const audioFiles = fs.readdirSync(audioDir).filter(f => f.endsWith('.mp3'));
    
    let imageSizeKB = 0;
    let audioSizeKB = 0;
    
    imageFiles.forEach(file => {
      const filePath = path.join(imagesDir, file);
      if (fs.existsSync(filePath)) {
        imageSizeKB += fs.statSync(filePath).size / 1024;
      }
    });
    
    audioFiles.forEach(file => {
      const filePath = path.join(audioDir, file);
      if (fs.existsSync(filePath)) {
        audioSizeKB += fs.statSync(filePath).size / 1024;
      }
    });

    return {
      images: { count: imageFiles.length, totalSizeKB: Math.round(imageSizeKB) },
      audio: { count: audioFiles.length, totalSizeKB: Math.round(audioSizeKB) },
      total: { count: imageFiles.length + audioFiles.length, totalSizeKB: Math.round(imageSizeKB + audioSizeKB) }
    };
  } catch (error) {
    return {
      images: { count: 0, totalSizeKB: 0 },
      audio: { count: 0, totalSizeKB: 0 },
      total: { count: 0, totalSizeKB: 0 }
    };
  }
}

export function cleanOldCacheFiles(): { cleaned: number; freedKB: number } {
  let cleaned = 0;
  let freedKB = 0;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

  try {
    const metadataFiles = fs.readdirSync(metadataDir).filter(f => f.endsWith('.json'));
    
    metadataFiles.forEach(file => {
      const metadataPath = path.join(metadataDir, file);
      try {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        const age = Date.now() - metadata.timestamp;
        
        if (age > maxAge) {
          // Get file size before deletion
          if (fs.existsSync(metadata.localPath)) {
            freedKB += fs.statSync(metadata.localPath).size / 1024;
            fs.unlinkSync(metadata.localPath);
          }
          fs.unlinkSync(metadataPath);
          cleaned++;
        }
      } catch (error) {
        // Remove corrupted metadata files
        if (fs.existsSync(metadataPath)) {
          fs.unlinkSync(metadataPath);
          cleaned++;
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }

  return { cleaned, freedKB: Math.round(freedKB) };
}

// ANALYSIS CACHING FUNCTIONS

export function getCachedAnalysis(content: string): any | null {
  const hash = generateContentHash({ content: content.trim() });
  const metadataPath = path.join(metadataDir, `analysis_${hash}.json`);
  
  if (fs.existsSync(metadataPath)) {
    try {
      const metadata: CachedAnalysis = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      
      // Check age (7 days max for analysis cache)
      const age = Date.now() - metadata.timestamp;
      const maxAge = 7 * 24 * 60 * 60 * 1000;
      
      if (age < maxAge) {
        console.log(`Using cached analysis for story content: "${content.substring(0, 50)}..."`);
        return metadata.analysis;
      } else {
        // Remove old cache
        fs.unlinkSync(metadataPath);
      }
    } catch (error) {
      console.error('Error reading analysis cache:', error);
      // Remove corrupted cache file
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
    }
  }
  
  return null;
}

export function cacheAnalysis(content: string, analysis: any): void {
  const hash = generateContentHash({ content: content.trim() });
  const metadataPath = path.join(metadataDir, `analysis_${hash}.json`);

  try {
    const metadata: CachedAnalysis = {
      id: hash,
      content: content.trim(),
      analysis,
      timestamp: Date.now()
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`Cached analysis for story: "${content.substring(0, 30)}..."`);
  } catch (error) {
    console.error('Error caching analysis:', error);
  }
}

// Initialize cache system
console.log(`Content cache initialized at: ${cacheDir}`);
console.log(`Cache stats:`, getAllCacheStats());