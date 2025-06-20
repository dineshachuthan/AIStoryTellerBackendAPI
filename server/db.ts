import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Configure WebSocket for Neon serverless in Node.js environment
if (typeof window === 'undefined') {
  try {
    const ws = require('ws');
    neonConfig.webSocketConstructor = ws;
  } catch (error) {
    console.warn('WebSocket configuration failed:', error);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool with minimal configuration to avoid connection issues
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

export const db = drizzle({ client: pool, schema });