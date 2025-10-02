import { Email } from '../types/email.js';
import { SessionManager } from './session-manager.js';
import { AgentClient } from './agent-client.js';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

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
 * Handles concurrent processing with configurable max jobs
 */
export class RefinementQueue {
  private jobs: Map<string, RefinementJob> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private onCompleteCallbacks: RefinementCompleteCallback[] = [];
  private onFailedCallbacks: RefinementFailedCallback[] = [];

  constructor(
    private sessionManager: SessionManager,
    private agentClient: AgentClient,
    maxConcurrent: number = 3
  ) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Enqueue a refinement job
   */
  async enqueue(
    emailId: string,
    currentDraft: string,
    feedback: string,
    email: Email
  ): Promise<void> {
    const job: RefinementJob = {
      emailId,
      currentDraft,
      feedback,
      email,
      status: 'queued'
    };

    this.jobs.set(emailId, job);

    // Start processing if we have available slots
    this.processNext();
  }

  /**
   * Process next available job if we're under max concurrent
   */
  private processNext(): void {
    if (this.processing.size >= this.maxConcurrent) {
      return; // At capacity
    }

    // Find next queued job
    const job = Array.from(this.jobs.values())
      .find(j => j.status === 'queued');

    if (!job) return; // No jobs waiting

    // Mark as processing
    job.status = 'processing';
    job.startTime = Date.now();
    this.processing.add(job.emailId);

    // Process in background (don't await!)
    this.processJob(job)
      .finally(() => {
        this.processing.delete(job.emailId);
        this.processNext(); // Try to start next job
      });
  }

  /**
   * Process a single refinement job
   */
  private async processJob(job: RefinementJob): Promise<void> {
    try {
      // Get or create session for this email
      const session = this.sessionManager.getOrCreateSession(job.emailId);

      // Increment turn count
      this.sessionManager.incrementTurn(job.emailId);

      // Build prompt for refinement
      const prompt = this.buildRefinementPrompt(
        job.email,
        job.currentDraft,
        job.feedback,
        session.turnCount
      );

      // Query options with session resume
      const options = session.sessionId
        ? { resume: session.sessionId, maxTurns: 1 }
        : { maxTurns: 1 };

      let result = '';

      // Stream the refinement
      for await (const message of this.agentClient.queryStream(prompt, options)) {
        // Update session with message
        this.sessionManager.updateSession(job.emailId, message);

        // Extract result
        if (message.type === 'result' && message.subtype === 'success') {
          result = message.result;
          job.cost = message.total_cost_usd;
          job.duration = message.duration_ms;
        }
      }

      if (!result) {
        throw new Error('No result received from agent');
      }

      // Mark job as complete
      job.status = 'complete';
      job.result = result;
      job.endTime = Date.now();

      // Notify listeners
      this.notifyComplete(job.emailId, result, job);

    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;
      job.endTime = Date.now();

      console.error(`Refinement failed for ${job.emailId}:`, error);

      // Notify listeners
      this.notifyFailed(job.emailId, error as Error);
    }
  }

  /**
   * Build refinement prompt
   */
  private buildRefinementPrompt(
    email: Email,
    currentDraft: string,
    feedback: string,
    turnCount: number
  ): string {
    // First turn: provide full context
    if (turnCount === 1) {
      return `You are refining an email draft. Here's the context:

Original Email:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.date}

Email Content:
${email.body}

Current Draft:
${currentDraft}

User Feedback:
${feedback}

Please provide an improved version of the draft that addresses the user's feedback. Return only the improved draft text, no explanations.`;
    }

    // Subsequent turns: just the feedback (session maintains context)
    return feedback;
  }

  /**
   * Register callback for successful refinements
   */
  onComplete(callback: RefinementCompleteCallback): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Register callback for failed refinements
   */
  onFailed(callback: RefinementFailedCallback): void {
    this.onFailedCallbacks.push(callback);
  }

  /**
   * Notify all listeners of completion
   */
  private notifyComplete(emailId: string, result: string, job: RefinementJob): void {
    this.onCompleteCallbacks.forEach(cb => {
      try {
        cb(emailId, result, job);
      } catch (error) {
        console.error('Error in onComplete callback:', error);
      }
    });
  }

  /**
   * Notify all listeners of failure
   */
  private notifyFailed(emailId: string, error: Error): void {
    this.onFailedCallbacks.forEach(cb => {
      try {
        cb(emailId, error);
      } catch (err) {
        console.error('Error in onFailed callback:', err);
      }
    });
  }

  /**
   * Get count of pending jobs (queued + processing)
   */
  getPendingCount(): number {
    return Array.from(this.jobs.values())
      .filter(j => j.status === 'queued' || j.status === 'processing')
      .length;
  }

  /**
   * Get count of jobs currently processing
   */
  getProcessingCount(): number {
    return this.processing.size;
  }

  /**
   * Get a specific job
   */
  getJob(emailId: string): RefinementJob | undefined {
    return this.jobs.get(emailId);
  }

  /**
   * Get all jobs with a specific status
   */
  getJobsByStatus(status: RefinementJobStatus): RefinementJob[] {
    return Array.from(this.jobs.values())
      .filter(j => j.status === status);
  }

  /**
   * Remove a completed or failed job
   */
  removeJob(emailId: string): void {
    const job = this.jobs.get(emailId);
    if (job && (job.status === 'complete' || job.status === 'failed')) {
      this.jobs.delete(emailId);
    }
  }

  /**
   * Clear all completed and failed jobs
   */
  clearCompletedJobs(): void {
    for (const [emailId, job] of this.jobs) {
      if (job.status === 'complete' || job.status === 'failed') {
        this.jobs.delete(emailId);
      }
    }
  }

  /**
   * Get total cost of all refinements
   */
  getTotalCost(): number {
    let total = 0;
    for (const job of this.jobs.values()) {
      total += job.cost || 0;
    }
    return total;
  }

  /**
   * Cleanup the queue
   */
  cleanup(): void {
    this.jobs.clear();
    this.processing.clear();
    this.onCompleteCallbacks = [];
    this.onFailedCallbacks = [];
  }
}
