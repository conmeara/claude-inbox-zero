export interface EmailSender {
    name: string;
    email: string;
}
export interface Email {
    id: string;
    from: EmailSender;
    subject: string;
    date: string;
    body: string;
    unread: boolean;
    requiresResponse: boolean;
}
export interface EmailSummary {
    emailId: string;
    summary: string;
}
export interface EmailDraft {
    emailId: string;
    draftContent: string;
    status: 'pending' | 'accepted' | 'edited' | 'skipped';
    editedContent?: string;
}
export interface EmailBatch {
    emails: Email[];
    summaries: EmailSummary[];
    drafts: EmailDraft[];
}
export interface InboxData {
    emails: Email[];
}
export type EmailState = 'queued' | 'reviewing' | 'refining' | 'refined' | 'accepted' | 'skipped' | 'failed';
export interface ConversationEntry {
    type: 'draft' | 'user' | 'tool' | 'refinement';
    content: string;
    timestamp: Date;
    metadata?: {
        toolName?: string;
        toolInput?: any;
        toolOutput?: any;
    };
}
export interface EmailQueueItem {
    email: Email;
    summary: string;
    draft?: EmailDraft;
    state: EmailState;
    refinedDraft?: string;
    refinementFeedback?: string;
    refinementCount?: number;
    conversationHistory?: ConversationEntry[];
}
export interface QueueStatus {
    primaryRemaining: number;
    refinedWaiting: number;
    completed: number;
    refining: number;
    currentState?: EmailState;
}
export interface InboxSearchCriteria {
    query?: string;
    from?: string;
    requiresResponse?: boolean;
}
//# sourceMappingURL=email.d.ts.map