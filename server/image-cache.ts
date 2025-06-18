import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Directory to store cached images - use persistent storage
const CACHE_DIR = process.env.CACHE_DIR || path.join(process.cwd(), 'persistent-cache', 'images');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// Generate a unique key for a character based on their properties
function generateCharacterKey(character: any, storyContext: string): string {
  const characterString = JSON.stringify({
    name: character.name,
    description: character.description,
    personality: character.personality,
    role: character.role,
    appearance: character.appearance,
    traits: character.traits,
    context: storyContext.substring(0, 200) // Use first 200 chars of context
  });
  return crypto.createHash('md5').update(characterString).digest('hex');
}

// Check if we have a cached image for this character
export function getCachedImage(character: any, storyContext: string): string | null {
  const key = generateCharacterKey(character, storyContext);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  
  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      // Check if cache is not too old (30 days)
      const cacheAge = Date.now() - cached.timestamp;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
      
      if (cacheAge < maxAge) {
        console.log(`Using cached image for character: ${character.name}`);
        return cached.imageUrl;
      } else {
        // Remove old cache
        fs.unlinkSync(cachePath);
      }
    } catch (error) {
      console.error('Error reading cached image:', error);
      // Remove corrupted cache file
      fs.unlinkSync(cachePath);
    }
  }
  
  return null;
}

// Save a generated image to cache
export function cacheImage(character: any, storyContext: string, imageUrl: string): void {
  const key = generateCharacterKey(character, storyContext);
  const cachePath = path.join(CACHE_DIR, `${key}.json`);
  
  const cacheData = {
    character: {
      name: character.name,
      description: character.description,
      personality: character.personality,
      role: character.role
    },
    imageUrl,
    timestamp: Date.now()
  };
  
  try {
    fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));
    console.log(`Cached image for character: ${character.name}`);
  } catch (error) {
    console.error('Error caching image:', error);
  }
}

// Get cache statistics
export function getCacheStats(): { totalCached: number; totalSizeKB: number } {
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
    let totalSizeKB = 0;
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      const stats = fs.statSync(filePath);
      totalSizeKB += stats.size / 1024;
    });
    
    return {
      totalCached: files.length,
      totalSizeKB: Math.round(totalSizeKB)
    };
  } catch (error) {
    return { totalCached: 0, totalSizeKB: 0 };
  }
}

// Clean old cache files (older than 30 days)
export function cleanOldCache(): number {
  let cleaned = 0;
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  try {
    const files = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
    
    files.forEach(file => {
      const filePath = path.join(CACHE_DIR, file);
      try {
        const cached = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const cacheAge = Date.now() - cached.timestamp;
        
        if (cacheAge > maxAge) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch (error) {
        // Remove corrupted files
        fs.unlinkSync(filePath);
        cleaned++;
      }
    });
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
  
  return cleaned;
}