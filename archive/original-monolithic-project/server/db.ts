import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from '@shared/schema/schema';

// Configure WebSocket for Neon serverless in Node.js environment
neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true; // Use fetch for better rate limit handling

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with conservative settings to avoid rate limits
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1, // Limit to 1 connection to avoid rate limits
  idleTimeoutMillis: 30000, // Close idle connections quickly
  connectionTimeoutMillis: 10000,
  // Reduce concurrent operations
  maxUses: 10000,
  allowExitOnIdle: true,
});

export const db = drizzle({ client: pool, schema });

// Add connection error handling
pool.on('error', (err) => {
  console.warn('Database pool error:', err.message);
});

// Graceful connection management
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isRateLimit = error.message?.includes('rate limit') || 
                         error.message?.includes('Control plane request failed');
      
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
};