import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

interface CacheInvalidationMessage {
  type: 'CACHE_INVALIDATE';
  table: string;
  recordId?: string | number;
  queryKeys: string[][];
}

class CacheInvalidationService {
  private wsServer?: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  /**
   * Initialize WebSocket server for cache invalidation
   */
  setupWebSocket(httpServer: Server): void {
    this.wsServer = new WebSocketServer({ 
      server: httpServer, 
      path: '/cache-invalidation'
    });

    this.wsServer.on('connection', (ws) => {
      this.clients.add(ws);
      console.log('🔄 Cache invalidation client connected');
      
      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('🔄 Cache invalidation client disconnected');
      });

      ws.on('error', (error) => {
        console.error('Cache invalidation WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcast cache invalidation to all connected clients
   */
  invalidateCache(table: string, recordId?: string | number): void {
    if (this.clients.size === 0) {
      console.log(`🔄 No clients connected for cache invalidation of table: ${table}`);
      return;
    }

    const queryKeys = this.getQueryKeysForTable(table, recordId);
    
    const message: CacheInvalidationMessage = {
      type: 'CACHE_INVALIDATE',
      table,
      recordId,
      queryKeys
    };

    const messageStr = JSON.stringify(message);
    
    // Send to all connected clients
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });

    console.log(`🔄 Cache invalidation sent for table: ${table}, keys: ${queryKeys.length}`);
  }

  /**
   * Get query keys that should be invalidated for a given table
   */
  private getQueryKeysForTable(table: string, recordId?: string | number): string[][] {
    const queryKeys: string[][] = [];
    
    switch (table) {
      case 'user_voice_emotions':
        queryKeys.push(
          ["/api/voice-samples"],
          ["/api/voice-cloning/session-status"],
          ["/api/voice-samples/progress"],
          ["/api/voice-training/status"]
        );
        break;
      case 'voice_profiles':
        queryKeys.push(
          ["/api/voice-cloning/session-status"],
          ["/api/voice-training/status"]
        );
        break;
      case 'emotion_voices':
        queryKeys.push(
          ["/api/voice-cloning/session-status"],
          ["/api/voice-training/status"]
        );
        break;
      case 'stories':
        queryKeys.push(
          ["/api/stories"],
          ["/api/stories/user"]
        );
        if (recordId) {
          queryKeys.push(["/api/stories", recordId.toString()]);
        }
        break;
      case 'story_analysis':
        if (recordId) {
          queryKeys.push(["/api/stories", recordId.toString(), "analysis"]);
        }
        break;
      case 'generated_audio_cache':
        queryKeys.push(["/api/audio-cache/stats"]);
        break;
      default:
        console.warn(`Unknown table for cache invalidation: ${table}`);
    }
    
    return queryKeys;
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    if (this.wsServer) {
      this.wsServer.close();
    }
  }
}

export const cacheInvalidationService = new CacheInvalidationService();