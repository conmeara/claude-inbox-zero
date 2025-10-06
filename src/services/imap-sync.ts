import { EmailDatabase, Recipient } from './email-database.js';
import { ImapManager, ImapSearchCriteria } from './imap-manager.js';
import * as path from 'path';
import * as os from 'os';

const DATABASE_PATH = path.join(os.homedir(), '.claude-inbox', 'emails.db');

export interface SyncOptions {
  folder?: string;
  folders?: string[];
  since?: Date;
  before?: Date;
  limit?: number;
  isUnread?: boolean;
  gmailQuery?: string;
}

/**
 * EmailSyncService - Syncs emails from IMAP to SQLite database
 * Adapted from Anthropic's claude-code-sdk-demos sample
 */
export class EmailSyncService {
  private imapManager: ImapManager;
  private database: EmailDatabase;

  constructor(dbPath: string = DATABASE_PATH) {
    this.imapManager = ImapManager.getInstance();
    this.database = new EmailDatabase(dbPath);
  }

  /**
   * Extract recipients from parsed email
   * Handles mailparser output format
   */
  private extractRecipients(parsedEmail: any, emailId: number): Recipient[] {
    const recipients: Recipient[] = [];

    // Process TO recipients
    if (parsedEmail.to?.value) {
      for (const addr of parsedEmail.to.value) {
        recipients.push({
          email_id: emailId,
          type: "to",
          address: addr.address?.toLowerCase() || "",
          name: addr.name
        });
      }
    }

    // Process CC recipients
    if (parsedEmail.cc?.value) {
      for (const addr of parsedEmail.cc.value) {
        recipients.push({
          email_id: emailId,
          type: "cc",
          address: addr.address?.toLowerCase() || "",
          name: addr.name
        });
      }
    }

    // Process BCC recipients
    if (parsedEmail.bcc?.value) {
      for (const addr of parsedEmail.bcc.value) {
        recipients.push({
          email_id: emailId,
          type: "bcc",
          address: addr.address?.toLowerCase() || "",
          name: addr.name
        });
      }
    }

    return recipients;
  }

  /**
   * Sync emails from IMAP to database
   */
  public async syncEmails(options: SyncOptions = {}): Promise<{ synced: number; skipped: number }> {
    console.log('🔄 Starting email sync...');

    // Build IMAP search criteria
    const criteria: ImapSearchCriteria = {
      folder: options.folder,
      folders: options.folders,
      gmailQuery: options.gmailQuery,
      isUnread: options.isUnread,
      limit: options.limit || 100,
    };

    if (options.since || options.before) {
      criteria.dateRange = {
        start: options.since || new Date(0),
        end: options.before || new Date()
      };
    }

    // Fetch emails from IMAP
    const results = await this.imapManager.searchEmails(criteria);

    console.log(`📥 Fetched ${results.length} emails from IMAP`);

    let synced = 0;
    let skipped = 0;

    for (const { email, attachments } of results) {
      try {
        // Check if email already exists
        const existing = this.database.getByMessageId(email.message_id);

        if (existing) {
          skipped++;
          continue;
        }

        // Insert email with recipients and attachments
        const emailId = this.database.insertEmail(email, [], attachments);

        // Note: Recipients are not extracted from ImapManager's parsed emails yet
        // This would require enhancing the ImapManager to return recipient info
        // For now, we'll rely on the database's ability to handle empty recipient lists

        synced++;
      } catch (error) {
        console.error(`Error syncing email ${email.message_id}:`, error);
      }
    }

    console.log(`✅ Sync complete: ${synced} synced, ${skipped} skipped`);

    return { synced, skipped };
  }

  /**
   * Sync recent emails (last N days)
   */
  public async syncRecent(days: number = 7, folders?: string[]): Promise<{ synced: number; skipped: number }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.syncEmails({
      since,
      folders: folders || ["INBOX"],
      limit: 500
    });
  }

  /**
   * Sync unread emails only
   */
  public async syncUnread(folders?: string[]): Promise<{ synced: number; skipped: number }> {
    return this.syncEmails({
      isUnread: true,
      folders: folders || ["INBOX"],
      limit: 100
    });
  }

  /**
   * Full inbox sync (last 30 days)
   */
  public async fullSync(folders?: string[]): Promise<{ synced: number; skipped: number }> {
    return this.syncRecent(30, folders || ["INBOX", "[Gmail]/Sent Mail"]);
  }

  /**
   * Get database statistics
   */
  public getStats() {
    return this.database.getStatistics();
  }

  /**
   * Close database connection
   */
  public close(): void {
    this.database.close();
    this.imapManager.disconnect();
  }
}
