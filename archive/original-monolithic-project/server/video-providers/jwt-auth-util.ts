/**
 * Shared JWT authentication utility for video providers
 * Supports any provider that needs JWT-based authentication
 */

export interface JWTConfig {
  apiKey: string;
  secretKey: string;
  issuer?: string; // Optional custom issuer, defaults to apiKey
  expirationMinutes?: number; // Optional expiration, defaults to 30 minutes
  notBeforeSeconds?: number; // Optional not-before offset, defaults to 5 seconds
}

export interface JWTProvider {
  name: string;
  generateJWT(config: JWTConfig): Promise<string>;
}

/**
 * Generic JWT generator that works for any provider
 */
export class JWTAuthUtil {
  /**
   * Generate JWT token for any provider
   * @param providerName Name of the provider (for logging)
   * @param config JWT configuration
   * @returns Promise<string> JWT token
   */
  static async generateJWTToken(providerName: string, config: JWTConfig): Promise<string> {
    const currentTime = Math.floor(Date.now() / 1000);
    
    // JWT Header - standard format
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    // JWT Payload - configurable
    const payload = {
      iss: config.issuer || config.apiKey, // Use custom issuer or apiKey as issuer
      exp: currentTime + (config.expirationMinutes || 30) * 60, // Default 30 minutes
      nbf: currentTime - (config.notBeforeSeconds || 5) // Default 5 seconds buffer
    };

    console.log(`JWT Generation for ${providerName}:`, {
      currentTime,
      issuer: payload.iss.substring(0, 8) + '...',
      secretKeyLength: config.secretKey.length,
      expiry: payload.exp,
      notBefore: payload.nbf,
      expirationMinutes: config.expirationMinutes || 30
    });

    // Base64 encode header and payload
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    // Create signature using SecretKey
    const crypto = await import('crypto');
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto
      .createHmac('sha256', config.secretKey)
      .update(signatureInput)
      .digest('base64url');

    // Combine to create JWT
    const jwtToken = `${encodedHeader}.${encodedPayload}.${signature}`;
    
    console.log(`Generated JWT token for ${providerName}:`, {
      tokenLength: jwtToken.length,
      preview: jwtToken.substring(0, 50) + '...'
    });
    
    return jwtToken;
  }

  /**
   * Validate JWT configuration
   */
  static validateJWTConfig(providerName: string, config: JWTConfig): void {
    if (!config.apiKey) {
      throw new Error(`${providerName}: API key is required for JWT authentication`);
    }
    
    if (!config.secretKey) {
      throw new Error(`${providerName}: Secret key is required for JWT authentication`);
    }
    
    if (config.expirationMinutes && config.expirationMinutes < 1) {
      throw new Error(`${providerName}: Expiration must be at least 1 minute`);
    }
    
    if (config.notBeforeSeconds && config.notBeforeSeconds < 0) {
      throw new Error(`${providerName}: Not-before offset cannot be negative`);
    }
  }

  /**
   * Create JWT config from provider configuration
   */
  static createJWTConfig(
    apiKey: string, 
    secretKey: string, 
    options?: {
      issuer?: string;
      expirationMinutes?: number;
      notBeforeSeconds?: number;
    }
  ): JWTConfig {
    return {
      apiKey,
      secretKey,
      issuer: options?.issuer,
      expirationMinutes: options?.expirationMinutes,
      notBeforeSeconds: options?.notBeforeSeconds
    };
  }
}

/**
 * Kling-specific JWT provider implementation
 */
export class KlingJWTProvider implements JWTProvider {
  readonly name = 'kling';

  async generateJWT(config: JWTConfig): Promise<string> {
    // Kling-specific configuration (30 minute expiration, 5 second buffer)
    const klingConfig: JWTConfig = {
      ...config,
      issuer: config.apiKey, // Kling uses apiKey as issuer
      expirationMinutes: 30,
      notBeforeSeconds: 5
    };

    JWTAuthUtil.validateJWTConfig(this.name, klingConfig);
    return JWTAuthUtil.generateJWTToken(this.name, klingConfig);
  }
}

/**
 * Factory for getting the appropriate JWT provider
 */
export class JWTProviderFactory {
  private static providers: Map<string, JWTProvider> = new Map([
    ['kling', new KlingJWTProvider()]
    // Add other JWT providers here as needed
  ]);

  static getProvider(providerName: string): JWTProvider | null {
    return this.providers.get(providerName.toLowerCase()) || null;
  }

  static registerProvider(name: string, provider: JWTProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }

  static getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}