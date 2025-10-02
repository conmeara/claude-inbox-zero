import { Email, InboxSearchCriteria } from '../types/email.js';
export declare class MockInboxService {
    private inboxData;
    private readonly mockDataPath;
    constructor();
    loadInboxData(): Promise<void>;
    getUnreadEmails(): Email[];
    getEmailBatch(batchSize?: number, offset?: number): Email[];
    getUnreadCount(): number;
    getEmailById(id: string): Email | undefined;
    markEmailAsRead(emailId: string): Promise<void>;
    markEmailsAsRead(emailIds: string[]): Promise<void>;
    private saveInboxData;
    resetInbox(): Promise<void>;
    getEmailsRequiringResponse(): Email[];
    getTotalEmailCount(): number;
    /**
     * Search emails by criteria (for MCP tools)
     */
    search(criteria: InboxSearchCriteria): Promise<Email[]>;
    /**
     * Get email by ID (for MCP tools)
     */
    getById(emailId: string): Promise<Email | null>;
}
//# sourceMappingURL=mockInbox.d.ts.map