import { 
  getCollaborativeConfig, 
  validateMediaFile, 
  canUserPerformAction,
  getNotificationTemplate 
} from '@shared/config/collaborative-config';

/**
 * Modular validation utilities for collaborative roleplay
 */
export class CollaborativeValidator {
  private config = getCollaborativeConfig();

  validateParticipantData(data: any, userType: 'registered' | 'guest'): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredFields = this.config.participation.requiredFields[userType];
    
    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
        errors.push(`${field} is required for ${userType} users`);
      }
    }

    // Guest-specific validations
    if (userType === 'guest') {
      if (data.guestName && data.guestName.length < 2) {
        errors.push('Guest name must be at least 2 characters');
      }
      if (data.guestEmail && !this.isValidEmail(data.guestEmail)) {
        errors.push('Invalid email format');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  validateTemplateData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.title || data.title.length < 3) {
      errors.push('Template title must be at least 3 characters');
    }

    if (data.characterRoles) {
      if (data.characterRoles.length < this.config.template.minCharacters) {
        errors.push(`Template must have at least ${this.config.template.minCharacters} characters`);
      }
      if (data.characterRoles.length > this.config.template.maxCharacters) {
        errors.push(`Template cannot have more than ${this.config.template.maxCharacters} characters`);
      }
    }

    if (data.genre && !this.config.template.supportedGenres.includes(data.genre)) {
      errors.push(`Unsupported genre. Supported genres: ${this.config.template.supportedGenres.join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  validateInstanceData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.instanceTitle || data.instanceTitle.length < 3) {
      errors.push('Instance title must be at least 3 characters');
    }

    return { isValid: errors.length === 0, errors };
  }

  validateStatusTransition(currentStatus: string, newStatus: string): boolean {
    const allowedTransitions = this.config.instance.statusFlow[currentStatus] || [];
    return allowedTransitions.includes(newStatus);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Modular permission manager for collaborative features
 */
export class CollaborativePermissionManager {
  private config = getCollaborativeConfig();

  canCreateTemplate(userType: 'registered' | 'guest'): boolean {
    return this.config.participation.userTypes[userType].canCreateTemplates;
  }

  canCreateInstance(userType: 'registered' | 'guest'): boolean {
    return this.config.participation.userTypes[userType].canCreateInstances;
  }

  canAccessFeature(userType: 'registered' | 'guest', feature: string): boolean {
    return canUserPerformAction(userType, feature);
  }

  getStorageLimits(userType: 'registered' | 'guest'): { voice: number; photo: number } {
    const limits = this.config.participation.userTypes[userType];
    return {
      voice: limits.voiceStorageLimit,
      photo: limits.photoStorageLimit
    };
  }

  getSessionExpiry(userType: 'registered' | 'guest'): number | null {
    if (userType === 'guest') {
      return this.config.participation.userTypes.guest.sessionExpiryHours * 60 * 60 * 1000; // milliseconds
    }
    return null; // Registered users don't expire
  }
}

/**
 * Modular token generator and validator
 */
export class CollaborativeTokenManager {
  private config = getCollaborativeConfig();

  generateInvitationToken(): string {
    const tokenLength = this.config.instance.invitationTokenLength;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < tokenLength; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return `invite_${Date.now()}_${result}`;
  }

  generateInstanceId(): string {
    return `inst_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  isTokenExpired(createdAt: Date): boolean {
    const expiryMs = this.config.instance.invitationExpiryDays * 24 * 60 * 60 * 1000;
    return Date.now() - createdAt.getTime() > expiryMs;
  }
}

/**
 * Modular progress calculator
 */
export class CollaborativeProgressCalculator {
  private config = getCollaborativeConfig();

  calculateParticipantProgress(
    voiceRecordings: any[] = [], 
    hasPhoto: boolean = false, 
    requiredEmotions: number = 0
  ): number {
    if (requiredEmotions === 0) return 0;

    const voiceProgress = (voiceRecordings.length / requiredEmotions) * this.config.instance.progressThresholds.voice;
    const photoProgress = hasPhoto ? this.config.instance.progressThresholds.photo : 0;
    
    return Math.min(100, Math.round(voiceProgress + photoProgress));
  }

  calculateInstanceProgress(participants: any[]): number {
    if (participants.length === 0) return 0;
    
    const totalProgress = participants.reduce((sum, p) => sum + (p.recordingProgress || 0), 0);
    return Math.round(totalProgress / (participants.length * 100) * 100);
  }

  isParticipantComplete(participant: any): boolean {
    return (participant.recordingProgress || 0) >= this.config.instance.progressThresholds.minimum;
  }

  areAllParticipantsComplete(participants: any[]): boolean {
    return participants.every(p => this.isParticipantComplete(p));
  }
}

/**
 * Modular notification manager
 */
export class CollaborativeNotificationManager {
  sendNotification(templateKey: string, variables: Record<string, string> = {}) {
    const template = getNotificationTemplate(templateKey, variables);
    if (!template) {
      console.warn(`Notification template not found: ${templateKey}`);
      return null;
    }
    
    return template;
  }

  getInvitationAcceptedNotification(userType: 'registered' | 'guest') {
    const key = userType === 'guest' ? 'guestLimitation' : 'invitationAccepted';
    return this.sendNotification(key);
  }

  getVoiceRecordedNotification(emotion: string) {
    return this.sendNotification('voiceRecorded', { emotion });
  }

  getPhotoUploadedNotification() {
    return this.sendNotification('photoUploaded');
  }

  getCompletionNotification() {
    return this.sendNotification('allCompleted');
  }

  getErrorNotification(errorType: string) {
    return this.sendNotification(errorType);
  }
}

/**
 * Factory for creating configured instances
 */
export class CollaborativeServiceFactory {
  static createValidator(config?: any): CollaborativeValidator {
    return new CollaborativeValidator();
  }

  static createPermissionManager(config?: any): CollaborativePermissionManager {
    return new CollaborativePermissionManager();
  }

  static createTokenManager(config?: any): CollaborativeTokenManager {
    return new CollaborativeTokenManager();
  }

  static createProgressCalculator(config?: any): CollaborativeProgressCalculator {
    return new CollaborativeProgressCalculator();
  }

  static createNotificationManager(config?: any): CollaborativeNotificationManager {
    return new CollaborativeNotificationManager();
  }
}