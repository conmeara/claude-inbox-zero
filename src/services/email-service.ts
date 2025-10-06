import { Email, InboxSearchCriteria } from '../types/email.js';
import { EmailDatabase, SearchOptions } from './email-database.js';
import { seedMockData, resetMockData } from './seed-mock-data.js';
import * as path from 'path';
import * as os from 'os';

/**
 * Unified EmailService - Replaces MockInboxService and will integrate with Gmail
 * Uses SQLite as the unified backend for both mock and real email data
 */
export class EmailService {
  private db: EmailDatabase;
  private mode: 'mock' | 'gmail';
  private isInitialized: boolean = false;

  constructor(mode: 'mock' | 'gmail' = 'mock') {
    this.mode = mode;

    // Use different database files for mock vs gmail mode
    const dbPath = mode === 'mock'
      ? path.join(os.homedir(), '.claude-inbox', 'mock-emails.db')
      : path.join(os.homedir(), '.claude-inbox', 'gmail-emails.db');

    this.db = new EmailDatabase(dbPath);
  }

  /**
   * Initialize the email service
   * For mock mode: seeds database from JSON if empty
   * For gmail mode: will sync from Gmail API
   */
  async loadInboxData(): Promise<void> {
    if (this.isInitialized) return;

    if (this.mode === 'mock') {
      // Check if database is empty
      const stats = this.db.getStatistics();
      if (stats.total_emails === 0) {
        console.log('Database empty, seeding mock data...');
        await seedMockData(this.db);
      }
    } else {
      // Gmail mode - will sync in future implementation
      console.log('Gmail mode - sync not yet implemented');
    }

    this.isInitialized = true;
  }

  /**
   * Reset inbox (mock mode only)
   * Clears database and reseeds from JSON, marking all as unread
   */
  async resetInbox(): Promise<void> {
    if (this.mode !== 'mock') {
      throw new Error('Reset is only supported in mock mode');
    }

    await resetMockData(this.db);
  }

  /**
   * Get all unread emails
   */
  getUnreadEmails(): Email[] {
    const records = this.db.getUnreadEmails(100);
    return records.map(record => this.convertToEmail(record));
  }

  /**
   * Get email by ID
   */
  async getById(emailId: string): Promise<Email | null> {
    const record = this.db.getByMessageId(emailId);
    if (!record) return null;
    return this.convertToEmail(record);
  }

  /**
   * Get multiple emails by IDs (for batch operations)
   */
  async getByIds(emailIds: string[]): Promise<Email[]> {
    const emails: Email[] = [];
    for (const id of emailIds) {
      const record = this.db.getByMessageId(id);
      if (record) {
        emails.push(this.convertToEmail(record));
      }
    }
    return emails;
  }

  /**
   * Mark emails as read
   */
  async markEmailsAsRead(emailIds: string[]): Promise<void> {
    this.db.markAsRead(emailIds);
  }

  /**
   * Search emails using various criteria
   */
  async search(criteria: InboxSearchCriteria & { gmailQuery?: string }): Promise<Email[]> {
    const searchOptions: SearchOptions = {};

    // Map our criteria to database search options
    if (criteria.query) {
      searchOptions.query = criteria.query;
    }

    if (criteria.from) {
      searchOptions.from = criteria.from;
    }

    if (criteria.gmailQuery) {
      // Parse Gmail query syntax (simplified version)
      // Full implementation would parse: from:, to:, subject:, etc.
      const query = criteria.gmailQuery;

      // Extract from: operator
      const fromMatch = query.match(/from:(\S+)/);
      if (fromMatch) {
        searchOptions.from = fromMatch[1];
      }

      // Extract subject: operator
      const subjectMatch = query.match(/subject:(\S+)/);
      if (subjectMatch) {
        searchOptions.subject = subjectMatch[1];
      }

      // Extract is:unread
      if (query.includes('is:unread')) {
        searchOptions.isUnread = true;
      }

      // Extract has:attachment
      if (query.includes('has:attachment')) {
        searchOptions.hasAttachments = true;
      }

      // Extract newer_than: operator
      const newerMatch = query.match(/newer_than:(\d+)d/);
      if (newerMatch) {
        const days = parseInt(newerMatch[1]);
        const date = new Date();
        date.setDate(date.getDate() - days);
        searchOptions.dateFrom = date;
      }

      // Extract older_than: operator
      const olderMatch = query.match(/older_than:(\d+)d/);
      if (olderMatch) {
        const days = parseInt(olderMatch[1]);
        const date = new Date();
        date.setDate(date.getDate() - days);
        searchOptions.dateTo = date;
      }

      // For any remaining text (not in operators), use as keyword search
      const cleanQuery = query
        .replace(/from:\S+/g, '')
        .replace(/subject:\S+/g, '')
        .replace(/is:unread/g, '')
        .replace(/has:attachment/g, '')
        .replace(/newer_than:\d+d/g, '')
        .replace(/older_than:\d+d/g, '')
        .trim();

      if (cleanQuery) {
        searchOptions.query = cleanQuery;
      }
    }

    const records = this.db.advancedSearch(searchOptions);
    return records.map(record => this.convertToEmail(record));
  }

  /**
   * Search with log file pattern (for large result sets)
   * Returns log file path for Claude to analyze
   */
  async searchWithLogs(gmailQuery: string): Promise<{
    totalResults: number;
    logFilePath: string;
    ids: string[];
  }> {
    const results = await this.search({ gmailQuery });

    // Write results to log file
    const logsDir = path.join(os.homedir(), '.claude-inbox', 'logs');
    if (!require('fs').existsSync(logsDir)) {
      require('fs').mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `email-search-${timestamp}.json`;
    const logFilePath = path.join(logsDir, logFileName);

    const logData = {
      query: gmailQuery,
      timestamp: new Date().toISOString(),
      totalResults: results.length,
      ids: results.map(e => e.id),
      emails: results
    };

    require('fs').writeFileSync(logFilePath, JSON.stringify(logData, null, 2));

    return {
      totalResults: results.length,
      logFilePath,
      ids: results.map(e => e.id)
    };
  }

  /**
   * Convert database record to Email type
   */
  private convertToEmail(record: any): Email {
    return {
      id: record.message_id,
      from: {
        name: record.from_name || record.from_address,
        email: record.from_address
      },
      subject: record.subject || '(no subject)',
      date: record.date_sent,
      body: record.body_text || '',
      unread: record.is_read === 0,
      requiresResponse: record.requires_response === 1
    };
  }

  /**
   * Get a batch of emails (for pagination)
   */
  getEmailBatch(limit: number, offset: number = 0): Email[] {
    const records = this.db.getUnreadEmails(1000); // Get all unread
    const batch = records.slice(offset, offset + limit);
    return batch.map(record => this.convertToEmail(record));
  }

  /**
   * Get count of unread emails
   */
  getUnreadCount(): number {
    const stats = this.db.getStatistics();
    return stats.unread_count || 0;
  }

  /**
   * Get total count of all emails
   */
  getTotalEmailCount(): number {
    const stats = this.db.getStatistics();
    return stats.total_emails || 0;
  }

  /**
   * Get emails that require a response
   */
  getEmailsRequiringResponse(): Email[] {
    const records = this.db.advancedSearch({ limit: 1000 });
    return records
      .filter(record => record.requires_response === 1)
      .map(record => this.convertToEmail(record));
  }

  /**
   * Get all emails
   */
  getAllEmails(): Email[] {
    const records = this.db.getRecentEmails(1000);
    return records.map(record => this.convertToEmail(record));
  }

  /**
   * Get database statistics
   */
  getStatistics(): any {
    return this.db.getStatistics();
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
