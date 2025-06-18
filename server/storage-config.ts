import path from 'path';
import { getEnvironment } from './oauth-config';

export interface StorageConfig {
  environment: string;
  cacheDir: string;
  imagesDir: string;
  audioDir: string;
  metadataDir: string;
  maxCacheSizeMB: number;
  maxFileAgeDays: number;
  enableCleanup: boolean;
  cdnUrl?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export function getStorageConfig(): StorageConfig {
  const environment = getEnvironment();
  
  // Environment-specific cache directories
  const getEnvCacheDir = () => {
    const baseDir = process.env.CACHE_DIR || path.join(process.cwd(), 'persistent-cache');
    return path.join(baseDir, environment);
  };

  const cacheDir = getEnvCacheDir();
  
  return {
    environment,
    cacheDir,
    imagesDir: path.join(cacheDir, 'images'),
    audioDir: path.join(cacheDir, 'audio'),
    metadataDir: path.join(cacheDir, 'metadata'),
    
    // Environment-specific cache limits
    maxCacheSizeMB: {
      development: 100,    // 100MB for dev
      staging: 500,       // 500MB for staging
      production: 2000    // 2GB for production
    }[environment] || 100,
    
    maxFileAgeDays: {
      development: 1,     // 1 day for dev
      staging: 7,         // 1 week for staging
      production: 30      // 1 month for production
    }[environment] || 1,
    
    enableCleanup: environment !== 'development',
    
    // CDN configuration for production
    cdnUrl: process.env[`CDN_URL_${environment.toUpperCase()}`] || process.env.CDN_URL,
    
    // S3 configuration for cloud storage (optional)
    s3Config: (process.env.AWS_S3_BUCKET && process.env.AWS_REGION) ? {
      bucket: process.env[`AWS_S3_BUCKET_${environment.toUpperCase()}`] || process.env.AWS_S3_BUCKET,
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    } : undefined,
  };
}

export function getPublicUrl(relativePath: string): string {
  const config = getStorageConfig();
  
  if (config.cdnUrl) {
    return `${config.cdnUrl}/${relativePath}`;
  }
  
  // Fallback to local serving
  return `/cache/${relativePath}`;
}