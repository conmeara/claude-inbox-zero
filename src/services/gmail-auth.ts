import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import open from 'open';
import * as http from 'http';

export interface GmailAuthConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
}

/**
 * GmailAuthService - Handles OAuth2 authentication for Gmail API
 * Based on Google's OAuth2 flow for installed applications
 */
export class GmailAuthService {
  private oauth2Client: OAuth2Client;
  private configDir: string;
  private tokenPath: string;
  private credentialsPath: string;

  // Default OAuth credentials for localhost development
  // Users can override these with environment variables
  private readonly DEFAULT_CLIENT_ID = process.env.GMAIL_CLIENT_ID || '';
  private readonly DEFAULT_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || '';
  private readonly DEFAULT_REDIRECT_URI = 'http://localhost:3000/oauth2callback';

  // Gmail API scopes
  private readonly SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
    'https://www.googleapis.com/auth/gmail.send'
  ];

  constructor(config?: GmailAuthConfig) {
    // Set up config directory in user's home
    this.configDir = path.join(homedir(), '.claude-inbox');
    this.tokenPath = path.join(this.configDir, 'gmail-token.json');
    this.credentialsPath = path.join(this.configDir, 'gmail-credentials.json');

    // Ensure config directory exists
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }

    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      config?.clientId || this.DEFAULT_CLIENT_ID,
      config?.clientSecret || this.DEFAULT_CLIENT_SECRET,
      config?.redirectUri || this.DEFAULT_REDIRECT_URI
    );
  }

  /**
   * Check if we have valid credentials
   */
  hasValidCredentials(): boolean {
    return fs.existsSync(this.tokenPath);
  }

  /**
   * Load saved credentials from disk
   */
  async loadCredentials(): Promise<OAuth2Client> {
    if (!fs.existsSync(this.tokenPath)) {
      throw new Error('No saved credentials found. Run with --setup-gmail first.');
    }

    const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
    this.oauth2Client.setCredentials(token);

    // Set up auto-refresh
    this.oauth2Client.on('tokens', (tokens) => {
      if (tokens.refresh_token) {
        // Update saved token with new refresh token
        const currentToken = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        currentToken.refresh_token = tokens.refresh_token;
        fs.writeFileSync(this.tokenPath, JSON.stringify(currentToken, null, 2));
      }
    });

    return this.oauth2Client;
  }

  /**
   * Start OAuth flow - opens browser and waits for callback
   */
  async authenticate(): Promise<OAuth2Client> {
    return new Promise((resolve, reject) => {
      // Create a local server to receive the OAuth callback
      const server = http.createServer(async (req, res) => {
        try {
          if (req.url && req.url.indexOf('/oauth2callback') > -1) {
            // Extract code from query params
            const url = new URL(req.url, this.DEFAULT_REDIRECT_URI);
            const code = url.searchParams.get('code');

            if (!code) {
              res.end('Error: No authorization code received');
              server.close();
              reject(new Error('No authorization code received'));
              return;
            }

            // Exchange code for tokens
            const { tokens } = await this.oauth2Client.getToken(code);
            this.oauth2Client.setCredentials(tokens);

            // Save tokens to disk
            fs.writeFileSync(this.tokenPath, JSON.stringify(tokens, null, 2));

            // Send success response
            res.end('Authentication successful! You can close this window and return to the terminal.');
            server.close();
            resolve(this.oauth2Client);
          }
        } catch (error) {
          res.end('Authentication failed. Check the terminal for error details.');
          server.close();
          reject(error);
        }
      });

      server.listen(3000, () => {
        // Generate auth URL
        const authUrl = this.oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: this.SCOPES,
          prompt: 'consent' // Force consent screen to get refresh token
        });

        console.log('\nOpening browser for Gmail authentication...');
        console.log('If the browser does not open, visit this URL:');
        console.log(authUrl);
        console.log('');

        // Open browser
        open(authUrl).catch(() => {
          console.log('Could not open browser automatically. Please visit the URL above.');
        });
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        server.close();
        reject(new Error('Authentication timed out'));
      }, 5 * 60 * 1000);
    });
  }

  /**
   * Get authenticated OAuth2 client
   * Loads existing credentials or throws error
   */
  async getAuthClient(): Promise<OAuth2Client> {
    if (this.hasValidCredentials()) {
      return await this.loadCredentials();
    } else {
      throw new Error('Not authenticated. Run with --setup-gmail to authenticate.');
    }
  }

  /**
   * Revoke credentials and delete saved token
   */
  async revokeCredentials(): Promise<void> {
    if (fs.existsSync(this.tokenPath)) {
      // Revoke token with Google
      try {
        await this.oauth2Client.revokeCredentials();
      } catch (error) {
        console.warn('Failed to revoke token with Google:', error);
      }

      // Delete local token file
      fs.unlinkSync(this.tokenPath);
    }
  }

  /**
   * Save OAuth credentials (client ID and secret) to disk
   * This is separate from the token - these are your app credentials
   */
  saveCredentials(clientId: string, clientSecret: string): void {
    const credentials = {
      clientId,
      clientSecret,
      redirectUri: this.DEFAULT_REDIRECT_URI
    };

    fs.writeFileSync(this.credentialsPath, JSON.stringify(credentials, null, 2));
  }

  /**
   * Load OAuth credentials from disk
   */
  loadOAuthCredentials(): { clientId: string; clientSecret: string; redirectUri: string } | null {
    if (!fs.existsSync(this.credentialsPath)) {
      return null;
    }

    return JSON.parse(fs.readFileSync(this.credentialsPath, 'utf-8'));
  }
}
