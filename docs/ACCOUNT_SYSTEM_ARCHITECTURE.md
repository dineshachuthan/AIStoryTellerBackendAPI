# Account System Architecture

## Overview

This document outlines the comprehensive account creation and authentication system architecture, including multi-dimensional cache keys for relationship-aware narration.

## Database Schema

### User Authentication Tables

```sql
-- Enhanced user authentication
CREATE TABLE user_login_history (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  login_timestamp TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  location_info JSONB,
  login_method VARCHAR(50), -- 'google', 'email', 'microsoft', 'facebook'
  session_id VARCHAR(255),
  is_successful BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User emotion tracking (separate from login)
CREATE TABLE user_emotion_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  session_id VARCHAR(255),
  emotion VARCHAR(50) NOT NULL DEFAULT 'neutral',
  emotion_confidence REAL, -- 0.0 to 1.0
  detection_method VARCHAR(50), -- 'manual', 'voice_analysis', 'text_sentiment'
  context VARCHAR(100), -- 'story_reading', 'voice_recording', 'invitation_viewing'
  story_id INTEGER REFERENCES stories(id),
  metadata JSONB,
  captured_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_security_questions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  question_id INTEGER,
  answer_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE user_2fa_settings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) UNIQUE,
  method VARCHAR(50), -- 'sms', 'email', 'authenticator'
  is_enabled BOOLEAN DEFAULT false,
  phone_number VARCHAR(20),
  authenticator_secret VARCHAR(255),
  backup_codes TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Update existing tables
ALTER TABLE users ADD COLUMN password_hint VARCHAR(255);
ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN account_locked_until TIMESTAMP;

-- Update invitations table for conversation style
ALTER TABLE story_invitations ADD COLUMN conversation_style VARCHAR(50) DEFAULT 'respectful';
```

## Multi-Dimensional Cache Architecture

### Cache Key Structure for Narration

```javascript
// Full multi-dimensional cache key
const narrationCacheKey = [
  `/api/stories/${storyId}/narration/saved`,
  authorUserId,           // Story author's ID
  conversationStyle,      // Relationship context from invitation
  narratorProfile,        // User's narrator preference
  userRealtimeEmotion     // Current user emotion from session
];

// Default values to ensure cache never fails
const defaults = {
  conversationStyle: 'respectful',
  narratorProfile: 'neutral',
  userRealtimeEmotion: 'neutral'
};
```

### Session Emotion Cache

```javascript
// Redis/In-memory session cache structure
{
  userId: string,
  sessionId: string,
  currentEmotion: string,      // Default: 'neutral'
  lastUpdated: timestamp,
  detectionMethod: string,     // How emotion was detected
  emotionHistory: [{           // Track emotion changes
    emotion: string,
    timestamp: Date,
    context: string
  }]
}
```

## REST API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register              // Email/password registration
POST   /api/auth/login                 // Email/password login
POST   /api/auth/logout                // Logout
GET    /api/auth/check-email           // Check if email exists
POST   /api/auth/verify-email          // Email verification
POST   /api/auth/resend-verification   // Resend verification email
```

### Password Recovery

```
POST   /api/auth/forgot-password       // Initiate password reset
POST   /api/auth/reset-password        // Complete password reset
GET    /api/auth/security-questions    // Get user's security questions
POST   /api/auth/verify-security       // Verify security answers
POST   /api/auth/update-password-hint  // Update password hint
```

### Two-Factor Authentication

```
POST   /api/auth/2fa/setup            // Setup 2FA method
POST   /api/auth/2fa/verify           // Verify 2FA code
POST   /api/auth/2fa/disable          // Disable 2FA
GET    /api/auth/2fa/backup-codes     // Get backup codes
POST   /api/auth/2fa/regenerate       // Regenerate backup codes
POST   /api/auth/2fa/send-code        // Send SMS/Email code
```

### User Emotion & Session

```
GET    /api/user/current-emotion      // Get current emotion from cache
POST   /api/user/update-emotion       // Update emotion in session
GET    /api/user/emotion-history      // Get emotion tracking history
GET    /api/user/login-history        // Get login history
```

### Narration with Multi-Dimensional Keys

```
// Generate narration with full context
POST   /api/stories/:id/narration/generate
Body: {
  conversationStyle: string,
  narratorProfile: string,
  userEmotion: string
}

// Retrieve cached narration
GET    /api/stories/:id/narration/cached
Query: {
  authorId: string,
  conversationStyle: string,
  narratorProfile: string,
  userEmotion: string
}
```

## Invitee Landing Page Flow

### 1. Auto-Narration Generation
```javascript
// On landing page load
1. Extract invitation token
2. Fetch invitation details (includes conversationStyle)
3. Get user's current emotion from session (default: 'neutral')
4. Check cache for existing narration variant
5. If missing, auto-generate with relationship parameters
6. Show loading state during generation
```

### 2. Streamlined Registration
```javascript
// Minimal signup form
- Email: Pre-populated from invitation
- Password: Required (8-12 chars, complexity rules)
- Confirm Password: Required
- reCAPTCHA: Automatic validation
- Terms: Checkbox required
```

### 3. Voice Collection Strategy
```javascript
// Post-story engagement (all 3 options combined)
1. Reciprocal Sharing: "Share your version back to [Author]"
2. Voice Comparison: "Hear this in YOUR voice"
3. Gamified Progress: "Unlock narrator voice (2 min)"
4. Emotional Response: Match current story emotion
```

## Implementation Patterns

### API Client Integration

```javascript
// api-client.ts additions
export const apiClient = {
  auth: {
    register: (data: RegisterData) => apiRequest('/api/auth/register', { method: 'POST', body: data }),
    login: (data: LoginData) => apiRequest('/api/auth/login', { method: 'POST', body: data }),
    forgotPassword: (email: string) => apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email } }),
    resetPassword: (data: ResetPasswordData) => apiRequest('/api/auth/reset-password', { method: 'POST', body: data }),
    setup2FA: (method: string) => apiRequest('/api/auth/2fa/setup', { method: 'POST', body: { method } }),
    verify2FA: (code: string) => apiRequest('/api/auth/2fa/verify', { method: 'POST', body: { code } }),
  },
  user: {
    getCurrentEmotion: () => apiRequest('/api/user/current-emotion'),
    updateEmotion: (emotion: string) => apiRequest('/api/user/update-emotion', { method: 'POST', body: { emotion } }),
    getEmotionHistory: () => apiRequest('/api/user/emotion-history'),
  }
};
```

### i18n Message Keys

```javascript
// Authentication messages
auth.register.title
auth.register.email.label
auth.register.password.label
auth.register.password.hint
auth.register.confirmPassword.label
auth.register.passwordStrength.weak
auth.register.passwordStrength.medium
auth.register.passwordStrength.strong
auth.register.submit
auth.register.success

auth.login.title
auth.login.forgotPassword
auth.login.noAccount
auth.login.rememberMe

auth.2fa.setup.title
auth.2fa.verify.title
auth.2fa.method.sms
auth.2fa.method.email
auth.2fa.method.authenticator

// Password requirements
auth.password.minLength
auth.password.requireUppercase
auth.password.requireNumber
auth.password.requireSpecial
```

### Toast Messages

```javascript
// toast-utils.ts patterns
toast.success(toastMessages.auth.registerSuccess);
toast.error(toastMessages.auth.loginFailed);
toast.info(toastMessages.auth.verificationSent);
```

## Security Considerations

### Password Policy
- Length: 8-12 characters minimum
- Complexity: Must include uppercase, numbers, special characters
- Strength indicator: Real-time feedback
- Password hints: Optional, stored separately
- Account lockout: After 5 failed attempts

### Rate Limiting
- Registration: 3 attempts per IP per hour
- Login: 10 attempts per IP per hour
- Password reset: 3 requests per email per day
- 2FA: 5 attempts before lockout

### Session Management
- JWT tokens with 7-day expiration
- Refresh tokens for seamless experience
- Device fingerprinting for security
- Concurrent session limiting (optional)

## Future Enhancements

### User Emotion Detection
1. **Voice Analysis**: Detect emotion from voice recordings
2. **Text Sentiment**: Analyze user's text input
3. **Facial Recognition**: Camera-based emotion detection
4. **Behavioral Patterns**: Learn from interaction patterns
5. **Manual Selection**: Allow users to set mood explicitly

### Advanced Authentication
1. **Biometric Login**: Fingerprint, Face ID support
2. **Passwordless**: Magic links, WebAuthn
3. **Social Providers**: Facebook, Twitter, LinkedIn
4. **Enterprise SSO**: SAML, LDAP integration