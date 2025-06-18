import type { DeviceInfo, BrowserInfo, NetworkInfo, UserSessionMetadata } from '@shared/userSession';

export class SessionMetadataDetector {
  private static instance: SessionMetadataDetector;
  
  static getInstance(): SessionMetadataDetector {
    if (!SessionMetadataDetector.instance) {
      SessionMetadataDetector.instance = new SessionMetadataDetector();
    }
    return SessionMetadataDetector.instance;
  }

  detectDeviceInfo(): DeviceInfo {
    const userAgent = navigator.userAgent;
    
    // Device type detection
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
    const type = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
    
    // OS detection
    let os = 'Unknown';
    let osVersion: string | undefined;
    let brand: string | undefined;
    
    if (userAgent.includes('Windows')) {
      os = 'Windows';
      const match = userAgent.match(/Windows NT (\d+\.\d+)/);
      osVersion = match ? match[1] : undefined;
    } else if (userAgent.includes('Mac OS')) {
      os = 'macOS';
      const match = userAgent.match(/Mac OS X (\d+[._]\d+[._]\d+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : undefined;
    } else if (userAgent.includes('iPhone')) {
      os = 'iOS';
      brand = 'Apple';
      const match = userAgent.match(/OS (\d+[._]\d+[._]\d+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : undefined;
    } else if (userAgent.includes('iPad')) {
      os = 'iPadOS';
      brand = 'Apple';
      const match = userAgent.match(/OS (\d+[._]\d+[._]\d+)/);
      osVersion = match ? match[1].replace(/_/g, '.') : undefined;
    } else if (userAgent.includes('Android')) {
      os = 'Android';
      const match = userAgent.match(/Android (\d+\.\d+)/);
      osVersion = match ? match[1] : undefined;
      
      // Brand detection for Android
      if (userAgent.includes('Samsung')) brand = 'Samsung';
      else if (userAgent.includes('Huawei')) brand = 'Huawei';
      else if (userAgent.includes('OnePlus')) brand = 'OnePlus';
      else if (userAgent.includes('Xiaomi')) brand = 'Xiaomi';
      else if (userAgent.includes('LG')) brand = 'LG';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    }

    return { type, os, osVersion, brand };
  }

  detectBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent;
    
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';
    
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+\.\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+\.\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Opera')) {
      name = 'Opera';
      const match = userAgent.match(/Opera\/(\d+\.\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    }

    return { name, version, engine };
  }

  detectNetworkInfo(): NetworkInfo {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    return {
      connection: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown'
    };
  }

  async detectCapabilities(): Promise<UserSessionMetadata['capabilities']> {
    const capabilities = {
      webRTC: false,
      mediaRecorder: false,
      audioContext: false,
      serviceWorker: false
    };

    // WebRTC support
    capabilities.webRTC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    
    // MediaRecorder support
    capabilities.mediaRecorder = typeof MediaRecorder !== 'undefined';
    
    // AudioContext support
    capabilities.audioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
    
    // Service Worker support
    capabilities.serviceWorker = 'serviceWorker' in navigator;

    return capabilities;
  }

  getDefaultPreferences(deviceInfo: DeviceInfo, networkInfo: NetworkInfo): UserSessionMetadata['preferences'] {
    const isLowEndDevice = deviceInfo.type === 'mobile' && (
      deviceInfo.os === 'Android' || 
      (deviceInfo.brand && ['Samsung', 'Huawei', 'Xiaomi'].includes(deviceInfo.brand))
    );
    
    const isSlowNetwork = networkInfo.effectiveType === '2g' || networkInfo.effectiveType === 'slow-2g';
    
    return {
      audioQuality: isLowEndDevice || isSlowNetwork ? 'medium' : 'high',
      autoPlay: deviceInfo.type === 'desktop',
      dataUsage: isSlowNetwork ? 'limited' : 'unlimited'
    };
  }

  async generateSessionMetadata(userId: string): Promise<UserSessionMetadata> {
    const deviceInfo = this.detectDeviceInfo();
    const browserInfo = this.detectBrowserInfo();
    const networkInfo = this.detectNetworkInfo();
    const capabilities = await this.detectCapabilities();
    const preferences = this.getDefaultPreferences(deviceInfo, networkInfo);
    
    return {
      userId,
      deviceInfo,
      browserInfo,
      networkInfo,
      capabilities,
      preferences,
      sessionId: this.generateSessionId(),
      timestamp: Date.now()
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}