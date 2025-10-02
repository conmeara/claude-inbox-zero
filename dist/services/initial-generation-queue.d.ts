import { Email, EmailDraft } from '../types/email.js';
import { AIService } from './ai.js';
export type GenerationJobStatus = 'queued' | 'processing' | 'complete' | 'failed';
export interface GenerationJob {
    emailId: string;
    email: Email;
    status: GenerationJobStatus;
    summary?: string;
    draft?: EmailDraft;
    error?: Error;
    startTime?: number;
    endTime?: number;
}
type GenerationCompleteCallback = (emailId: string, summary: string, draft: EmailDraft | null) => void;
type GenerationFailedCallback = (emailId: string, error: Error) => void;
/**
 * InitialGenerationQueue - Background processor for initial email summaries and drafts
 * Processes emails in the background while user reviews current email
 */
export declare class InitialGenerationQueue {
    private aiService;
    private jobs;
    private processing;
    private maxConcurrent;
    private onCompleteCallbacks;
    private onFailedCallbacks;
    constructor(aiService: AIService, maxConcurrent?: number);
    /**
     * Enqueue an email for processing
     */
    enqueue(email: Email): Promise<void>;
    /**
     * Process next available job if we're under max concurrent
     */
    private processNext;
    /**
     * Process a single generation job
     */
    private processJob;
    /**
     * Register callback for successful generations
     */
    onComplete(callback: GenerationCompleteCallback): void;
    /**
     * Register callback for failed generations
     */
    onFailed(callback: GenerationFailedCallback): void;
    /**
     * Notify all listeners of completion
     */
    private notifyComplete;
    /**
     * Notify all listeners of failure
     */
    private notifyFailed;
    /**
     * Get count of pending jobs (queued + processing)
     */
    getPendingCount(): number;
    /**
     * Get count of jobs currently processing
     */
    getProcessingCount(): number;
    /**
     * Get a specific job
     */
    getJob(emailId: string): GenerationJob | undefined;
    /**
     * Check if an email is ready (has completed generation)
     */
    isReady(emailId: string): boolean;
    /**
     * Get completed job result
     */
    getResult(emailId: string): {
        summary: string;
        draft: EmailDraft | null;
    } | null;
    /**
     * Cleanup the queue
     */
    cleanup(): void;
}
export {};
//# sourceMappingURL=initial-generation-queue.d.ts.map