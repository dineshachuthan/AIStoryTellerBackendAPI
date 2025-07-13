/**
 * Audio Storage Provider Configuration
 * Defines available audio storage providers and their configuration
 */

export interface AudioStorageProviderConfig {
  priority: number;
  enabled: boolean;
  baseUrl: string;
  name: string;
}

export const AUDIO_STORAGE_PROVIDERS: Record<string, AudioStorageProviderConfig> = {
  replit: {
    priority: 1,
    enabled: true,
    baseUrl: process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` 
      : 'http://localhost:5000',
    name: 'Replit'
  },
  s3: {
    priority: 2,
    enabled: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
    baseUrl: process.env.AWS_S3_BUCKET 
      ? `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com` 
      : '',
    name: 'Amazon S3'
  },
  azure: {
    priority: 3,
    enabled: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    baseUrl: process.env.AZURE_STORAGE_ACCOUNT 
      ? `https://${process.env.AZURE_STORAGE_ACCOUNT}.blob.core.windows.net` 
      : '',
    name: 'Azure Blob Storage'
  }
};

export interface SignedUrlOptions {
  expiresIn: string;
  purpose: string;
  userId: string;
}