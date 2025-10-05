import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailAuthService } from './gmail-auth.js';
import { Email, InboxSearchCriteria } from '../types/email.js';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';

/**
 * GmailService - Implements the same interface as MockInboxService
 * but uses real Gmail API
 */
export class GmailService {
  private authService: GmailAuthService;
  private gmail: gmail_v1.Gmail | null = null;
  private emailCache: Email[] = [];
  private logsDir: string;

  constructor(authService?: GmailAuthService) {
    this.authService = authService || new GmailAuthService();
    this.logsDir = path.join(homedir(), '.claude-inbox', 'logs');

    // Ensure logs directory exists
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  /**
   * Load inbox data - for Gmail this means authenticate and initialize API
   */
  async loadInboxData(): Promise<void> {
    const auth = await this.authService.getAuthClient();
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Get unread emails from Gmail
   */
  async getUnreadEmails(): Promise<Email[]> {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call loadInboxData() first.');
    }

    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 100
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    // Fetch full details for each message
    for (const message of messages) {
      if (!message.id) continue;

      const email = await this.getGmailMessage(message.id);
      if (email) {
        emails.push(email);
      }
    }

    this.emailCache = emails;
    return emails;
  }

  /**
   * Get a batch of emails
   */
  getEmailBatch(batchSize: number = 10, offset: number = 0): Email[] {
    return this.emailCache.slice(offset, offset + batchSize);
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.emailCache.length;
  }

  /**
   * Get email by ID
   */
  getEmailById(id: string): Email | undefined {
    return this.emailCache.find(email => email.id === id);
  }

  /**
   * Mark email as read in Gmail
   */
  async markEmailAsRead(emailId: string): Promise<void> {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call loadInboxData() first.');
    }

    await this.gmail.users.messages.modify({
      userId: 'me',
      id: emailId,
      requestBody: {
        removeLabelIds: ['UNREAD']
      }
    });

    // Update cache
    const email = this.emailCache.find(e => e.id === emailId);
    if (email) {
      email.unread = false;
    }
  }

  /**
   * Mark multiple emails as read
   */
  async markEmailsAsRead(emailIds: string[]): Promise<void> {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call loadInboxData() first.');
    }

    // Gmail supports batch modify
    await this.gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: emailIds,
        removeLabelIds: ['UNREAD']
      }
    });

    // Update cache
    for (const id of emailIds) {
      const email = this.emailCache.find(e => e.id === id);
      if (email) {
        email.unread = false;
      }
    }
  }

  /**
   * Search emails using Gmail query syntax
   * This is the key method that supports powerful Gmail searches
   */
  async search(criteria: InboxSearchCriteria & { gmailQuery?: string }): Promise<Email[]> {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call loadInboxData() first.');
    }

    // Build Gmail query string
    let query = '';

    if (criteria.gmailQuery) {
      // Use raw Gmail query if provided
      query = criteria.gmailQuery;
    } else {
      // Build query from criteria
      const parts: string[] = [];

      if (criteria.query) {
        parts.push(criteria.query);
      }

      if (criteria.from) {
        parts.push(`from:${criteria.from}`);
      }

      if (criteria.requiresResponse !== undefined) {
        // This is a custom flag, we'll filter after fetching
      }

      query = parts.join(' ');
    }

    // Search Gmail
    const response = await this.gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50
    });

    const messages = response.data.messages || [];
    const emails: Email[] = [];

    // Fetch full details for each message
    for (const message of messages) {
      if (!message.id) continue;

      const email = await this.getGmailMessage(message.id);
      if (email) {
        emails.push(email);
      }
    }

    // Filter by requiresResponse if needed (custom logic)
    if (criteria.requiresResponse !== undefined) {
      return emails.filter(e => e.requiresResponse === criteria.requiresResponse);
    }

    return emails;
  }

  /**
   * Search with log file output (pattern from Anthropic sample)
   * Returns log file path instead of full results
   */
  async searchWithLogs(gmailQuery: string): Promise<{ totalResults: number; logFilePath: string; ids: string[] }> {
    const results = await this.search({ gmailQuery });

    // Generate timestamped log file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `gmail-search-${timestamp}.json`;
    const logFilePath = path.join(this.logsDir, logFileName);

    // Extract IDs
    const ids = results.map(email => email.id);

    // Write full results to log file
    const logData = {
      query: gmailQuery,
      timestamp: new Date().toISOString(),
      totalResults: results.length,
      ids: ids,
      emails: results
    };

    fs.writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

    return {
      totalResults: results.length,
      logFilePath,
      ids
    };
  }

  /**
   * Get email by ID (for MCP tools)
   */
  async getById(emailId: string): Promise<Email | null> {
    if (!this.gmail) {
      throw new Error('Gmail not initialized. Call loadInboxData() first.');
    }

    // Check cache first
    const cached = this.emailCache.find(e => e.id === emailId);
    if (cached) {
      return cached;
    }

    // Fetch from Gmail
    return await this.getGmailMessage(emailId);
  }

  /**
   * Get multiple emails by IDs
   */
  async getByIds(emailIds: string[]): Promise<Email[]> {
    const emails: Email[] = [];

    for (const id of emailIds) {
      const email = await this.getById(id);
      if (email) {
        emails.push(email);
      }
    }

    return emails;
  }

  /**
   * Helper: Fetch and parse a Gmail message
   */
  private async getGmailMessage(messageId: string): Promise<Email | null> {
    if (!this.gmail) {
      return null;
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      if (!message) return null;

      // Parse headers
      const headers = message.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

      const from = getHeader('from');
      const subject = getHeader('subject');
      const date = getHeader('date');

      // Parse email address
      const fromMatch = from.match(/^(.*?)\s*<(.+?)>$/);
      const fromName = fromMatch ? fromMatch[1].trim() : from;
      const fromEmail = fromMatch ? fromMatch[2].trim() : from;

      // Get body
      const body = this.extractBody(message.payload);

      // Check if unread
      const isUnread = message.labelIds?.includes('UNREAD') || false;

      // Determine if requires response (simple heuristic)
      const requiresResponse = this.detectRequiresResponse(subject, body);

      return {
        id: messageId,
        from: {
          name: fromName,
          email: fromEmail
        },
        subject: subject || '(No Subject)',
        date: date || new Date().toISOString(),
        body: body || '',
        unread: isUnread,
        requiresResponse
      };
    } catch (error) {
      console.error(`Failed to fetch message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract body from Gmail message payload
   */
  private extractBody(payload?: gmail_v1.Schema$MessagePart): string {
    if (!payload) return '';

    // Check if this part has body data
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    // Recursively check parts
    if (payload.parts) {
      for (const part of payload.parts) {
        // Prefer text/plain
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }
      }

      // Fallback to text/html
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Simple HTML to text conversion (remove tags)
          return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }

      // Recursively check nested parts
      for (const part of payload.parts) {
        const body = this.extractBody(part);
        if (body) return body;
      }
    }

    return '';
  }

  /**
   * Simple heuristic to detect if email requires response
   */
  private detectRequiresResponse(subject: string, body: string): boolean {
    const text = (subject + ' ' + body).toLowerCase();

    // Keywords that suggest response needed
    const responseKeywords = [
      '?',
      'please reply',
      'let me know',
      'confirm',
      'respond',
      'rsvp',
      'feedback',
      'review',
      'approval',
      'urgent',
      'action required'
    ];

    // Keywords that suggest no response needed
    const noResponseKeywords = [
      'newsletter',
      'digest',
      'notification',
      'automated',
      'no-reply',
      'noreply',
      'unsubscribe',
      'fyi'
    ];

    // Check for no-response keywords first
    for (const keyword of noResponseKeywords) {
      if (text.includes(keyword)) {
        return false;
      }
    }

    // Check for response keywords
    for (const keyword of responseKeywords) {
      if (text.includes(keyword)) {
        return true;
      }
    }

    return false; // Default to no response needed
  }

  /**
   * Get total email count (all emails in inbox)
   */
  getTotalEmailCount(): number {
    return this.emailCache.length;
  }

  /**
   * Get emails requiring response
   */
  getEmailsRequiringResponse(): Email[] {
    return this.emailCache.filter(email => email.requiresResponse);
  }

  /**
   * Reset inbox (not applicable for Gmail, but keep for interface compatibility)
   */
  async resetInbox(): Promise<void> {
    // For Gmail, we just refresh the cache
    await this.getUnreadEmails();
  }
}
