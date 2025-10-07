import { Email, EmailQueueItem, QueueStatus, EmailDraft } from '../types/email.js';
/**
 * EmailQueueManager - Manages three queues for async email processing
 *
 * Flow:
 * 1. Primary queue: unprocessed emails (shown first)
 * 2. When user requests refinement, email moves to background
 * 3. When refinement completes, email moves to refined queue
 * 4. Refined queue has priority (shown before primary queue)
 * 5. Accepted/skipped emails move to completed queue
 */
export declare class EmailQueueManager {
    private primaryQueue;
    private refinedQueue;
    private completedQueue;
    private currentItem;
    private itemsById;
    private allItems;
    private currentIndex;
    constructor(emails: Email[]);
    /**
     * Get the next email to review
     * Priority: refined queue > primary queue with summaries
     * Only returns emails that have been processed (have summaries)
     */
    getNext(): EmailQueueItem | null;
    /**
     * Get the previous email in sequence (for navigation)
     */
    getPrevious(): EmailQueueItem | null;
    /**
     * Get the next email in sequence (for navigation, different from getNext which uses queues)
     */
    getNextInSequence(): EmailQueueItem | null;
    /**
     * Get current item being reviewed
     */
    getCurrent(): EmailQueueItem | null;
    /**
     * Mark current email as refining (moves to background)
     */
    markRefining(emailId: string, feedback: string): void;
    /**
     * Mark email as refined (completed refinement, ready for review)
     */
    markRefined(emailId: string, refinedDraft: string): void;
    /**
     * Mark email as failed refinement
     */
    markFailed(emailId: string, error: Error): void;
    /**
     * Mark current email as accepted
     */
    markAccepted(emailId: string): void;
    /**
     * Mark current email as skipped
     */
    markSkipped(emailId: string): void;
    /**
     * Update an item's summary
     */
    updateSummary(emailId: string, summary: string): void;
    /**
     * Update an item's draft
     */
    updateDraft(emailId: string, draft: EmailDraft): void;
    /**
     * Get item by email ID
     */
    getItem(emailId: string): EmailQueueItem | undefined;
    /**
     * Check if there are more emails to process
     */
    hasMore(): boolean;
    /**
     * Get count of emails that are ready to be reviewed (have summaries)
     */
    getReadyCount(): number;
    /**
     * Get queue status for UI display
     */
    getStatus(): QueueStatus;
    /**
     * Get all completed items (accepted or skipped)
     */
    getCompleted(): EmailQueueItem[];
    /**
     * Get all accepted drafts
     */
    getAcceptedDrafts(): EmailDraft[];
    /**
     * Get items currently being refined
     */
    getRefiningItems(): EmailQueueItem[];
    /**
     * Get total statistics
     */
    getStats(): {
        total: number;
        processed: number;
        accepted: number;
        skipped: number;
        refining: number;
        refined: number;
        failed: number;
    };
    /**
     * Reset the queue (for testing)
     */
    reset(): void;
}
//# sourceMappingURL=email-queue-manager.d.ts.map