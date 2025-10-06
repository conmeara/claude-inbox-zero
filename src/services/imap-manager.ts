import Imap from 'node-imap';
import { simpleParser } from 'mailparser';
import { EmailRecord, Attachment } from './email-database.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.claude-inbox');
const IMAP_CONFIG_PATH = path.join(CONFIG_DIR, 'imap-config.json');

export interface ImapConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: { servername: string };
  connTimeout?: number;
  authTimeout?: number;
  keepalive?: any;
}

export interface ImapSearchCriteria {
  query?: string;
  from?: string | string[];
  to?: string | string[];
  subject?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  hasAttachments?: boolean;
  isUnread?: boolean;
  gmailQuery?: string;  // Gmail-specific native search syntax
  folder?: string;
  folders?: string[];
  limit?: number;
}

/**
 * ImapManager - Manages IMAP connections and email fetching
 * Adapted from Anthropic's claude-code-sdk-demos sample
 * Singleton pattern for connection reuse
 */
export class ImapManager {
  private static instance: ImapManager;
  private imapConfig: ImapConfig;
  private imap: any;
  private isConnected: boolean = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor(config?: Partial<ImapConfig>) {
    // Build config from saved config, environment, or provided config
    const savedConfig = this.loadSavedConfig();
    const EMAIL = config?.user || savedConfig?.user || process.env.EMAIL_ADDRESS || process.env.EMAIL_USER;
    const PASSWORD = config?.password || savedConfig?.password || process.env.EMAIL_APP_PASSWORD || process.env.EMAIL_PASS;

    console.log('🔧 IMAP Configuration:');
    console.log('   Email:', EMAIL ? `${EMAIL.substring(0, 3)}...@${EMAIL.split('@')[1]}` : 'NOT SET');
    console.log('   Password:', PASSWORD ? '***SET***' : 'NOT SET');
    console.log('   Host:', config?.host || savedConfig?.host || process.env.IMAP_HOST || "imap.gmail.com");

    if (!EMAIL || !PASSWORD) {
      throw new Error(
        "Email credentials not found! Please run 'setup-imap' command or set EMAIL_ADDRESS and EMAIL_APP_PASSWORD environment variables"
      );
    }

    this.imapConfig = {
      user: EMAIL,
      password: PASSWORD,
      host: config?.host || savedConfig?.host || process.env.IMAP_HOST || "imap.gmail.com",
      port: config?.port || savedConfig?.port || parseInt(process.env.IMAP_PORT || "993"),
      tls: config?.tls !== undefined ? config.tls : (savedConfig?.tls ?? true),
      tlsOptions: config?.tlsOptions || savedConfig?.tlsOptions || { servername: config?.host || savedConfig?.host || "imap.gmail.com" },
      connTimeout: config?.connTimeout || 30000,
      authTimeout: config?.authTimeout || 30000,
      keepalive: config?.keepalive !== undefined ? config.keepalive : {
        interval: 10000,
        idleInterval: 300000,
        forceNoop: true
      },
    };

    this.imap = new Imap(this.imapConfig);
  }

  public static getInstance(config?: Partial<ImapConfig>): ImapManager {
    if (!ImapManager.instance) {
      ImapManager.instance = new ImapManager(config);
    }
    return ImapManager.instance;
  }

  private loadSavedConfig(): Partial<ImapConfig> | null {
    try {
      if (fs.existsSync(IMAP_CONFIG_PATH)) {
        const data = fs.readFileSync(IMAP_CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Could not load saved IMAP config:', error);
    }
    return null;
  }

  public static saveConfig(config: Partial<ImapConfig>): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(IMAP_CONFIG_PATH, JSON.stringify(config, null, 2));
  }

  private async connect(): Promise<void> {
    if (this.isConnected) return;

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.connectionPromise = null;
        this.imap.end();
        reject(new Error('IMAP connection timeout after 30 seconds'));
      }, 30000);

      const onReady = () => {
        clearTimeout(timeout);
        this.isConnected = true;
        this.connectionPromise = null;
        console.log('✅ IMAP connection established');
        resolve();
      };

      const onError = (err: Error) => {
        console.error('❌ IMAP connection error:', err.message);
        clearTimeout(timeout);
        this.isConnected = false;
        this.connectionPromise = null;
        reject(err);
      };

      const onEnd = () => {
        clearTimeout(timeout);
        this.isConnected = false;
        this.connectionPromise = null;
      };

      this.imap.once("ready", onReady);
      this.imap.once("error", onError);
      this.imap.once("end", onEnd);

      try {
        console.log('🔌 Connecting to IMAP server:', this.imapConfig.host);
        this.imap.connect();
      } catch (err) {
        console.error('❌ IMAP connect error:', err);
        clearTimeout(timeout);
        this.connectionPromise = null;
        reject(err);
      }
    });

    return this.connectionPromise;
  }

  private async ensureConnection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
  }

  private openMailbox(mailbox: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.imap.openBox(mailbox, true, (err: Error | null, box: any) => {
        if (err) reject(err);
        else resolve(box);
      });
    });
  }

  // Convert ImapSearchCriteria to IMAP search array
  private buildImapSearchCriteria(criteria: ImapSearchCriteria): any[] {
    const searchCriteria: any[] = [];

    // PRIORITY: If gmailQuery is provided, use Gmail's native search syntax (X-GM-RAW)
    if (criteria.gmailQuery) {
      console.log('📧 Using Gmail native search syntax:', criteria.gmailQuery);
      searchCriteria.push(['X-GM-RAW', criteria.gmailQuery]);
      return searchCriteria;
    }

    if (criteria.query) {
      searchCriteria.push(['OR',
        ['SUBJECT', criteria.query],
        ['BODY', criteria.query]
      ]);
    }

    if (criteria.from) {
      const fromAddresses = Array.isArray(criteria.from) ? criteria.from : [criteria.from];
      if (fromAddresses.length === 1) {
        searchCriteria.push(['FROM', fromAddresses[0]]);
      } else {
        const orConditions = fromAddresses.map(addr => ['FROM', addr]);
        searchCriteria.push(['OR', ...orConditions]);
      }
    }

    if (criteria.to) {
      const toAddresses = Array.isArray(criteria.to) ? criteria.to : [criteria.to];
      if (toAddresses.length === 1) {
        searchCriteria.push(['TO', toAddresses[0]]);
      } else {
        const orConditions = toAddresses.map(addr => ['TO', addr]);
        searchCriteria.push(['OR', ...orConditions]);
      }
    }

    if (criteria.subject) {
      searchCriteria.push(['SUBJECT', criteria.subject]);
    }

    if (criteria.dateRange) {
      if (criteria.dateRange.start) {
        searchCriteria.push(['SINCE', criteria.dateRange.start]);
      }
      if (criteria.dateRange.end) {
        searchCriteria.push(['BEFORE', criteria.dateRange.end]);
      }
    }

    if (criteria.hasAttachments) {
      searchCriteria.push(['KEYWORD', 'has:attachment']);
    }

    if (criteria.isUnread !== undefined) {
      searchCriteria.push(criteria.isUnread ? 'UNSEEN' : 'SEEN');
    }

    // Default to ALL if no criteria specified
    if (searchCriteria.length === 0) {
      searchCriteria.push('ALL');
    }

    return searchCriteria;
  }

  private searchMailbox(criteria: any[]): Promise<number[]> {
    return new Promise((resolve, reject) => {
      this.imap.search(criteria, (err: Error | null, results: number[]) => {
        if (err) reject(err);
        else resolve(results || []);
      });
    });
  }

  private fetchEmail(uid: number, headersOnly: boolean = false): Promise<any> {
    return new Promise((resolve, reject) => {
      const fetchOptions = headersOnly
        ? { bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE MESSAGE-ID IN-REPLY-TO REFERENCES)', struct: true }
        : { bodies: "" };

      const fetch = this.imap.fetch(uid, fetchOptions);
      let emailData = "";
      let resolved = false;
      let attributes: any = null;

      const safeResolve = (result: any) => {
        if (!resolved) {
          resolved = true;
          resolve(result);
        }
      };

      const safeReject = (error: Error) => {
        if (!resolved) {
          resolved = true;
          reject(error);
        }
      };

      fetch.on("message", (msg: any) => {
        msg.on("body", (stream: any) => {
          stream.on("data", (chunk: Buffer) => {
            // Memory bounds checking (max 50MB per email)
            if (emailData.length + chunk.length > 50 * 1024 * 1024) {
              safeReject(new Error("Email too large (exceeds 50MB limit)"));
              return;
            }
            emailData += chunk.toString("utf8");
          });
        });

        msg.on("attributes", (attrs: any) => {
          attributes = attrs;
        });

        msg.once("end", () => {
          if (headersOnly && attributes) {
            simpleParser(emailData, (err: Error | null, parsed: any) => {
              if (err) safeReject(err);
              else {
                parsed.attributes = attributes;
                safeResolve(parsed);
              }
            });
          } else {
            simpleParser(emailData, (err: Error | null, parsed: any) => {
              if (err) safeReject(err);
              else safeResolve(parsed);
            });
          }
        });
      });

      fetch.once("error", (error: Error) => {
        safeReject(error);
      });

      fetch.once("end", () => {
        if (!emailData && !resolved) {
          safeReject(new Error("No email data received"));
        }
      });
    });
  }

  // Fetch emails in parallel with batching
  private async fetchEmailsBatch(uids: number[], headersOnly: boolean = false, batchSize: number = 20): Promise<Map<number, any>> {
    const results = new Map<number, any>();
    const effectiveBatchSize = headersOnly ? 30 : batchSize;

    for (let i = 0; i < uids.length; i += effectiveBatchSize) {
      const batch = uids.slice(i, i + effectiveBatchSize);
      const promises = batch.map(async (uid) => {
        try {
          const parsed = await this.fetchEmail(uid, headersOnly);
          return { uid, parsed };
        } catch (err) {
          console.error(`Error fetching email ${uid}:`, (err as Error).message);
          return { uid, parsed: null };
        }
      });

      const batchResults = await Promise.all(promises);
      for (const { uid, parsed } of batchResults) {
        if (parsed) {
          results.set(uid, parsed);
        }
      }
    }

    return results;
  }

  // Convert parsed email to EmailRecord
  private parseEmailToRecord(parsed: any, uid: number, folder: string): { email: EmailRecord; attachments: Attachment[] } {
    // Extract attachments
    const attachments: Attachment[] = [];
    if (parsed.attachments && parsed.attachments.length > 0) {
      for (const att of parsed.attachments) {
        attachments.push({
          email_id: 0, // Will be set when inserted
          filename: att.filename || "unnamed",
          content_type: att.contentType,
          size_bytes: att.size,
          content_id: att.contentId,
          is_inline: att.contentDisposition === "inline",
        });
      }
    }

    const email: EmailRecord = {
      message_id: parsed.messageId || `${uid}-${Date.now()}`,
      thread_id: parsed.threadId || parsed.inReplyTo,
      in_reply_to: parsed.inReplyTo,
      email_references: Array.isArray(parsed.references) ? parsed.references.join(" ") : parsed.references,
      date_sent: parsed.date || new Date(),
      subject: parsed.subject || "",
      from_address: parsed.from?.value?.[0]?.address || "",
      from_name: parsed.from?.value?.[0]?.name || "",
      reply_to: parsed.replyTo?.value?.[0]?.address,
      body_text: parsed.text || "",
      body_html: parsed.html || "",
      snippet: (parsed.text || "").substring(0, 200),
      is_read: false,
      is_starred: false,
      is_important: false,
      is_draft: false,
      is_sent: folder === "Sent" || folder === "[Gmail]/Sent Mail",
      is_trash: folder === "Trash" || folder === "[Gmail]/Trash",
      is_spam: folder === "Spam" || folder === "[Gmail]/Spam",
      requires_response: false, // Will be determined by AI
      size_bytes: 0,
      has_attachments: attachments.length > 0,
      attachment_count: attachments.length,
      folder,
      labels: "",
      raw_headers: JSON.stringify(parsed.headers),
    };

    return { email, attachments };
  }

  /**
   * Search emails from IMAP with optimized parallel fetching
   */
  public async searchEmails(criteria: ImapSearchCriteria, headersOnly: boolean = false): Promise<Array<{ email: EmailRecord; attachments: Attachment[] }>> {
    await this.ensureConnection();

    const folders = criteria.folders || [criteria.folder || "INBOX"];
    const allEmails: Array<{ email: EmailRecord; attachments: Attachment[] }> = [];
    const limit = criteria.limit || 30;

    for (const folder of folders) {
      try {
        await this.openMailbox(folder);

        const imapCriteria = this.buildImapSearchCriteria(criteria);
        console.log(`🔍 Searching ${folder} with criteria:`, JSON.stringify(imapCriteria));

        const uids = await this.searchMailbox(imapCriteria);
        console.log(`📊 Found ${uids.length} messages in ${folder}`);

        if (uids.length === 0) {
          continue;
        }

        // Apply limit per folder (reverse to get newest first)
        const limitedUids = uids.slice(-Math.min(limit, uids.length)).reverse();
        console.log(`📥 Fetching ${limitedUids.length} messages...`);

        // Fetch emails in parallel batches
        const parsedEmails = await this.fetchEmailsBatch(limitedUids, headersOnly, 10);

        // Process fetched emails
        for (const uid of limitedUids) {
          const parsed = parsedEmails.get(uid);
          if (!parsed) continue;

          try {
            const result = this.parseEmailToRecord(parsed, uid, folder);
            allEmails.push(result);

            // Stop if we've reached the overall limit
            if (allEmails.length >= limit) {
              break;
            }
          } catch (err) {
            console.error(`Error processing email ${uid} from ${folder}:`, (err as Error).message);
          }
        }

        // Stop searching folders if we've reached the limit
        if (allEmails.length >= limit) {
          break;
        }
      } catch (err) {
        console.error(`Error searching folder ${folder}:`, (err as Error).message);
      }
    }

    console.log(`✅ Fetched total of ${allEmails.length} emails`);
    return allEmails;
  }

  /**
   * Sync emails for a specific date range
   */
  public async syncEmails(dateRange: { start: Date; end: Date }, folders?: string[]): Promise<Array<{ email: EmailRecord; attachments: Attachment[] }>> {
    const criteria: ImapSearchCriteria = {
      dateRange,
      folders: folders || ["INBOX", "[Gmail]/Sent Mail"],
      limit: 1000,
    };

    return this.searchEmails(criteria);
  }

  /**
   * Get recent emails
   */
  public async getRecentEmails(days: number = 7, folders?: string[]): Promise<Array<{ email: EmailRecord; attachments: Attachment[] }>> {
    const start = new Date();
    start.setDate(start.getDate() - days);

    return this.syncEmails(
      { start, end: new Date() },
      folders
    );
  }

  /**
   * Disconnect from IMAP
   */
  public disconnect(): void {
    if (this.isConnected && this.imap) {
      this.imap.end();
      this.isConnected = false;
      console.log('🔌 IMAP disconnected');
    }
  }

  /**
   * Force reconnect
   */
  public async reconnect(): Promise<void> {
    this.disconnect();
    await this.connect();
  }

  /**
   * Test IMAP connection
   */
  public static async testConnection(config: Partial<ImapConfig>): Promise<boolean> {
    try {
      const manager = new ImapManager(config);
      await manager.connect();
      manager.disconnect();
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }
}
