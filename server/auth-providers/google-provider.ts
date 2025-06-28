import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Express } from 'express';
import passport from 'passport';
import { IAuthProvider, AuthProviderInfo } from './auth-provider-interface';
import { getAuthConfig } from './auth-config';

export class GoogleAuthProvider implements IAuthProvider {
  name = 'google';

  isEnabled(): boolean {
    const config = getAuthConfig(this.name);
    return config?.enabled || false;
  }

  getStrategy(): GoogleStrategy {
    const config = getAuthConfig(this.name);
    if (!config) {
      throw new Error(`${this.name} auth configuration not found`);
    }

    return new GoogleStrategy(
      {
        clientID: config.clientId,
        clientSecret: config.clientSecret,
        callbackURL: config.callbackUrl,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const userInfo = this.extractUserInfo(profile);
          return done(null, userInfo);
        } catch (error) {
          return done(error as Error);
        }
      }
    );
  }

  extractUserInfo(profile: any): AuthProviderInfo {
    return {
      id: profile.id,
      email: profile.emails?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      displayName: profile.displayName || '',
      avatarUrl: profile.photos?.[0]?.value || '',
      provider: this.name,
      providerId: profile.id,
    };
  }

  getAuthUrl(redirectUrl?: string): string {
    const baseUrl = `/api/auth/${this.name}`;
    return redirectUrl ? `${baseUrl}?redirect=${encodeURIComponent(redirectUrl)}` : baseUrl;
  }

  setupRoutes(app: Express): void {
    const config = getAuthConfig(this.name);
    if (!config) return;

    // Authentication initiation route
    app.get(`/api/auth/${this.name}`, (req, res, next) => {
      console.log(`[OAuth] Initiating ${config.name} authentication`);
      
      // Store the redirect URL in session before authentication
      if (req.query.redirect) {
        (req.session as any).redirectAfterAuth = req.query.redirect as string;
      }
      
      passport.authenticate(this.name, { 
        scope: config.scope,
        ...config.additionalConfig
      })(req, res, next);
    });

    // Callback route
    app.get(`/api/auth/${this.name}/callback`,
      passport.authenticate(this.name, { failureRedirect: '/login' }),
      (req, res) => {
        console.log(`[OAuth] ${config.name} callback successful`);
        console.log('[OAuth] User authenticated:', !!req.user);
        
        // Get redirect URL from session or default to home
        const redirectUrl = (req.session as any).redirectAfterAuth || '/';
        delete (req.session as any).redirectAfterAuth; // Clean up
        
        // Send HTML that handles both popup and regular tab scenarios
        res.send(`
          <!DOCTYPE html>
          <html>
          <head><title>Login Success</title></head>
          <body>
            <script>
              console.log('OAuth callback page loaded');
              
              // Check if this is a popup window
              if (window.opener && !window.opener.closed) {
                console.log('Popup detected - notifying parent and closing');
                try {
                  // Send message to parent window with redirect URL
                  window.opener.postMessage({ 
                    type: 'OAUTH_SUCCESS', 
                    provider: '${this.name}',
                    redirectUrl: '${redirectUrl}'
                  }, window.location.origin);
                  
                  // Close popup after short delay
                  setTimeout(() => {
                    window.close();
                  }, 500);
                } catch (e) {
                  console.error('Error communicating with parent:', e);
                  window.close();
                }
              } else {
                console.log('Regular tab - redirecting to intended page');
                window.location.href = '${redirectUrl}';
              }
            </script>
            <div style="text-align: center; font-family: Arial, sans-serif; margin-top: 50px;">
              <h2>Login Successful!</h2>
              <p>Redirecting...</p>
            </div>
          </body>
          </html>
        `);
      }
    );
  }
}