import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class MockInboxService {
    inboxData = null;
    mockDataPath;
    constructor() {
        this.mockDataPath = path.join(__dirname, '../../mock-data/inbox.json');
    }
    async loadInboxData() {
        try {
            const data = await fs.readFile(this.mockDataPath, 'utf-8');
            this.inboxData = JSON.parse(data);
        }
        catch (error) {
            throw new Error(`Failed to load inbox data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getUnreadEmails() {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        return this.inboxData.emails.filter(email => email.unread);
    }
    getEmailBatch(batchSize = 10, offset = 0) {
        const unreadEmails = this.getUnreadEmails();
        return unreadEmails.slice(offset, offset + batchSize);
    }
    getUnreadCount() {
        return this.getUnreadEmails().length;
    }
    getEmailById(id) {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        return this.inboxData.emails.find(email => email.id === id);
    }
    async markEmailAsRead(emailId) {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        const email = this.inboxData.emails.find(email => email.id === emailId);
        if (email) {
            email.unread = false;
            await this.saveInboxData();
        }
    }
    async markEmailsAsRead(emailIds) {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        for (const emailId of emailIds) {
            const email = this.inboxData.emails.find(email => email.id === emailId);
            if (email) {
                email.unread = false;
            }
        }
        await this.saveInboxData();
    }
    async saveInboxData() {
        if (!this.inboxData) {
            throw new Error('No inbox data to save');
        }
        try {
            await fs.writeFile(this.mockDataPath, JSON.stringify(this.inboxData, null, 2));
        }
        catch (error) {
            throw new Error(`Failed to save inbox data: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    // Utility methods for demo purposes
    async resetInbox() {
        if (!this.inboxData) {
            return;
        }
        // Mark all emails as unread for demo purposes
        this.inboxData.emails.forEach(email => {
            email.unread = true;
        });
        await this.saveInboxData();
    }
    getEmailsRequiringResponse() {
        const unreadEmails = this.getUnreadEmails();
        return unreadEmails.filter(email => email.requiresResponse);
    }
    getTotalEmailCount() {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        return this.inboxData.emails.length;
    }
    /**
     * Search emails by criteria (for MCP tools)
     */
    async search(criteria) {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        let results = [...this.inboxData.emails];
        // Filter by query (searches in subject and body)
        if (criteria.query) {
            const query = criteria.query.toLowerCase();
            results = results.filter(email => email.subject.toLowerCase().includes(query) ||
                email.body.toLowerCase().includes(query));
        }
        // Filter by sender
        if (criteria.from) {
            const from = criteria.from.toLowerCase();
            results = results.filter(email => email.from.name.toLowerCase().includes(from) ||
                email.from.email.toLowerCase().includes(from));
        }
        // Filter by requiresResponse
        if (criteria.requiresResponse !== undefined) {
            results = results.filter(email => email.requiresResponse === criteria.requiresResponse);
        }
        return results;
    }
    /**
     * Get email by ID (for MCP tools)
     */
    async getById(emailId) {
        if (!this.inboxData) {
            throw new Error('Inbox data not loaded. Call loadInboxData() first.');
        }
        const email = this.inboxData.emails.find(e => e.id === emailId);
        return email || null;
    }
}
//# sourceMappingURL=mockInbox.js.map