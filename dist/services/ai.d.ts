import { Email, EmailSummary, EmailDraft } from '../types/email.js';
import { AgentClient } from './agent-client.js';
import { SessionManager } from './session-manager.js';
import { MockInboxService } from './mockInbox.js';
export declare class AIService {
    private readonly maxRetries;
    private readonly retryDelay;
    private configService;
    private memoryService;
    private agentClient;
    private sessionManager;
    private systemPrompt;
    private onProgress?;
    constructor(inboxService: MockInboxService);
    initialize(): Promise<void>;
    getSessionManager(): SessionManager;
    getAgentClient(): AgentClient;
    setProgressCallback(callback: (message: string) => void): void;
    private buildSystemPrompt;
    private delay;
    private callClaude;
    testApiKey(): Promise<{
        success: boolean;
        message: string;
    }>;
    hasApiKey(): boolean;
    summarizeEmailBatch(emails: Email[]): Promise<EmailSummary[]>;
    private buildBatchSummaryPrompt;
    private parseBatchSummaries;
    private summarizeEmailsIndividually;
    summarizeEmail(email: Email): Promise<string>;
    generateEmailDraft(email: Email): Promise<string>;
    generateEmailDrafts(emails: Email[]): Promise<EmailDraft[]>;
    processEmail(email: Email): Promise<{
        summary: string;
        draft?: EmailDraft;
    }>;
    private getFallbackDraft;
    askForClarification(email: Email, question: string): Promise<string>;
    improveEmailDraft(originalDraft: string, userFeedback: string, email: Email, onProgress?: (message: string) => void): Promise<string>;
    /**
     * Refine email draft with session support (multi-turn conversations)
     * This is the new method for async refinement queue
     */
    refineEmailDraftWithSession(emailId: string, currentDraft: string, feedback: string, email: Email, onProgress?: (message: string) => void): Promise<string>;
    /**
     * Build initial refinement prompt with full context
     */
    private buildInitialRefinementPrompt;
    streamBatchProcess(emails: Email[]): AsyncGenerator<{
        type: string;
        data: any;
    }>;
}
//# sourceMappingURL=ai.d.ts.map