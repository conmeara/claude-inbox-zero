import { Email } from '../types/email.js';
import { SessionManager } from './session-manager.js';
import { AgentClient } from './agent-client.js';
export type RefinementJobStatus = 'queued' | 'processing' | 'complete' | 'failed';
export interface RefinementJob {
    emailId: string;
    currentDraft: string;
    feedback: string;
    email: Email;
    status: RefinementJobStatus;
    result?: string;
    error?: Error;
    startTime?: number;
    endTime?: number;
    cost?: number;
    duration?: number;
}
type RefinementCompleteCallback = (emailId: string, result: string, job: RefinementJob) => void;
type RefinementFailedCallback = (emailId: string, error: Error) => void;
/**
 * RefinementQueue - Background processor for email draft refinements
 *
 * Features:
 * - Concurrent processing across different emails (up to maxConcurrent)
 * - Serial processing per email using MessageQueue (prevents race conditions)
 * - Session-aware refinements with context retention
 *
 * Based on patterns from Anthropic's email-agent sample.
 */
export declare class RefinementQueue {
    private sessionManager;
    private agentClient;
    private jobs;
    private processing;
    private maxConcurrent;
    private onCompleteCallbacks;
    private onFailedCallbacks;
    private emailQueues;
    constructor(sessionManager: SessionManager, agentClient: AgentClient, maxConcurrent?: number);
    /**
     * Get or create a MessageQueue for an email
     */
    private getOrCreateQueue;
    /**
     * Worker loop for a specific email
     * Processes refinements serially to prevent race conditions
     */
    private startEmailWorker;
    /**
     * Enqueue a refinement job
     * Jobs for the same email are processed serially (prevents race conditions)
     * Jobs for different emails can process concurrently (up to maxConcurrent)
     */
    enqueue(emailId: string, currentDraft: string, feedback: string, email: Email): Promise<void>;
    /**
     * Process a single refinement job
     */
    private processJob;
    /**
     * Build refinement prompt
     */
    private buildRefinementPrompt;
    /**
     * Register callback for successful refinements
     */
    onComplete(callback: RefinementCompleteCallback): void;
    /**
     * Register callback for failed refinements
     */
    onFailed(callback: RefinementFailedCallback): void;
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
    getJob(emailId: string): RefinementJob | undefined;
    /**
     * Get all jobs with a specific status
     */
    getJobsByStatus(status: RefinementJobStatus): RefinementJob[];
    /**
     * Remove a completed or failed job
     */
    removeJob(emailId: string): void;
    /**
     * Clear all completed and failed jobs
     */
    clearCompletedJobs(): void;
    /**
     * Get total cost of all refinements
     */
    getTotalCost(): number;
    /**
     * Cleanup the queue and close all message queues
     */
    cleanup(): void;
}
export {};
//# sourceMappingURL=refinement-queue.d.ts.map