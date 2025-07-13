import { queryClient } from './queryClient';

class SessionActivityTracker {
  private lastActivityTime = Date.now();
  private sessionExtensionThrottle = 60 * 1000; // Throttle session extension to once per minute
  private lastSessionExtension = 0;

  /**
   * Initialize session activity tracking
   */
  init(): void {
    // Track user interactions that should extend session
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    
    events.forEach(eventType => {
      document.addEventListener(eventType, this.handleUserActivity.bind(this), { passive: true });
    });

    console.log('📅 Session activity tracking initialized');
  }

  /**
   * Handle any user activity
   */
  private handleUserActivity(): void {
    this.lastActivityTime = Date.now();
    this.extendSessionIfNeeded();
  }

  /**
   * Extend session expiration if throttle period has passed
   */
  private extendSessionIfNeeded(): void {
    const now = Date.now();
    
    // Throttle session extension requests to avoid excessive API calls
    if (now - this.lastSessionExtension < this.sessionExtensionThrottle) {
      return;
    }

    this.lastSessionExtension = now;
    this.extendSession();
  }

  /**
   * Send session extension request to backend
   */
  private async extendSession(): Promise<void> {
    try {
      await fetch('/api/auth/extend-session', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📅 Session extended by 30 minutes');
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }

  /**
   * Get time since last activity
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.lastActivityTime;
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    
    events.forEach(eventType => {
      document.removeEventListener(eventType, this.handleUserActivity.bind(this));
    });
  }
}

export const sessionActivityTracker = new SessionActivityTracker();