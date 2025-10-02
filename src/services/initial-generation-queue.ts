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
export class InitialGenerationQueue {
  private jobs: Map<string, GenerationJob> = new Map();
  private processing: Set<string> = new Set();
  private maxConcurrent: number;
  private onCompleteCallbacks: GenerationCompleteCallback[] = [];
  private onFailedCallbacks: GenerationFailedCallback[] = [];

  constructor(
    private aiService: AIService,
    maxConcurrent: number = 3
  ) {
    this.maxConcurrent = maxConcurrent;
  }

  /**
   * Enqueue an email for processing
   */
  async enqueue(email: Email): Promise<void> {
    const job: GenerationJob = {
      emailId: email.id,
      email,
      status: 'queued'
    };

    this.jobs.set(email.id, job);

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
   * Process a single generation job
   */
  private async processJob(job: GenerationJob): Promise<void> {
    try {
      // Generate summary (always needed)
      const summary = await this.aiService.summarizeEmail(job.email);
      job.summary = summary;

      // Generate draft if email requires response
      let draft: EmailDraft | null = null;
      if (job.email.requiresResponse) {
        const draftContent = await this.aiService.generateEmailDraft(job.email);
        draft = {
          emailId: job.emailId,
          draftContent,
          status: 'pending'
        };
        job.draft = draft;
      }

      // Mark job as complete
      job.status = 'complete';
      job.endTime = Date.now();

      // Notify listeners
      this.notifyComplete(job.emailId, summary, draft);

    } catch (error) {
      job.status = 'failed';
      job.error = error as Error;
      job.endTime = Date.now();

      console.error(`Generation failed for ${job.emailId}:`, error);

      // Notify listeners
      this.notifyFailed(job.emailId, error as Error);
    }
  }

  /**
   * Register callback for successful generations
   */
  onComplete(callback: GenerationCompleteCallback): void {
    this.onCompleteCallbacks.push(callback);
  }

  /**
   * Register callback for failed generations
   */
  onFailed(callback: GenerationFailedCallback): void {
    this.onFailedCallbacks.push(callback);
  }

  /**
   * Notify all listeners of completion
   */
  private notifyComplete(emailId: string, summary: string, draft: EmailDraft | null): void {
    this.onCompleteCallbacks.forEach(cb => {
      try {
        cb(emailId, summary, draft);
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
  getJob(emailId: string): GenerationJob | undefined {
    return this.jobs.get(emailId);
  }

  /**
   * Check if an email is ready (has completed generation)
   */
  isReady(emailId: string): boolean {
    const job = this.jobs.get(emailId);
    return job?.status === 'complete';
  }

  /**
   * Get completed job result
   */
  getResult(emailId: string): { summary: string; draft: EmailDraft | null } | null {
    const job = this.jobs.get(emailId);
    if (job?.status === 'complete' && job.summary) {
      return {
        summary: job.summary,
        draft: job.draft || null
      };
    }
    return null;
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
