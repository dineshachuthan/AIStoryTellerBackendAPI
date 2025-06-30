import { queryClient } from './queryClient';

interface CacheInvalidationMessage {
  type: 'CACHE_INVALIDATE';
  table: string;
  recordId?: string | number;
  queryKeys: string[][];
}

class CacheInvalidationClient {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize WebSocket connection for cache invalidation
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/cache-invalidation`;
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('🔄 Cache invalidation WebSocket connected');
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message: CacheInvalidationMessage = JSON.parse(event.data);
          this.handleCacheInvalidation(message);
        } catch (error) {
          console.error('Error parsing cache invalidation message:', error);
        }
      };
      
      this.ws.onclose = () => {
        console.log('🔄 Cache invalidation WebSocket disconnected');
        this.scheduleReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('Cache invalidation WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create cache invalidation WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle cache invalidation message
   */
  private handleCacheInvalidation(message: CacheInvalidationMessage): void {
    if (message.type !== 'CACHE_INVALIDATE') {
      return;
    }

    console.log(`🔄 Invalidating cache for table: ${message.table}, keys: ${message.queryKeys.length}`);
    
    // Invalidate all specified query keys
    message.queryKeys.forEach(queryKey => {
      queryClient.invalidateQueries({ queryKey });
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('🔄 Max reconnection attempts reached for cache invalidation');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`🔄 Attempting to reconnect cache invalidation (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const cacheInvalidationClient = new CacheInvalidationClient();