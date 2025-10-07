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
export class EmailQueueManager {
    primaryQueue = [];
    refinedQueue = [];
    completedQueue = [];
    currentItem = null;
    itemsById = new Map();
    allItems = []; // For navigation
    currentIndex = -1; // Current position in allItems
    constructor(emails) {
        // Initialize primary queue with all emails
        this.primaryQueue = emails.map(email => ({
            email,
            summary: '',
            draft: undefined,
            state: 'queued',
            refinementCount: 0,
            conversationHistory: []
        }));
        // Build index for fast lookup
        this.primaryQueue.forEach(item => {
            this.itemsById.set(item.email.id, item);
        });
        // Store all items for navigation
        this.allItems = [...this.primaryQueue];
    }
    /**
     * Get the next email to review
     * Priority: refined queue > primary queue
     */
    getNext() {
        // Priority 1: Show refined emails first (user is waiting for these)
        if (this.refinedQueue.length > 0) {
            const item = this.refinedQueue.shift();
            item.state = 'reviewing';
            this.currentItem = item;
            // Update index
            this.currentIndex = this.allItems.findIndex(i => i.email.id === item.email.id);
            return item;
        }
        // Priority 2: Primary queue
        if (this.primaryQueue.length > 0) {
            const item = this.primaryQueue.shift();
            item.state = 'reviewing';
            this.currentItem = item;
            // Update index
            this.currentIndex = this.allItems.findIndex(i => i.email.id === item.email.id);
            return item;
        }
        // All queues empty
        return null;
    }
    /**
     * Get the previous email in sequence (for navigation)
     */
    getPrevious() {
        if (this.currentIndex <= 0) {
            return null; // Already at first item
        }
        this.currentIndex--;
        const item = this.allItems[this.currentIndex];
        item.state = 'reviewing';
        this.currentItem = item;
        return item;
    }
    /**
     * Get the next email in sequence (for navigation, different from getNext which uses queues)
     */
    getNextInSequence() {
        if (this.currentIndex >= this.allItems.length - 1) {
            return null; // Already at last item
        }
        this.currentIndex++;
        const item = this.allItems[this.currentIndex];
        item.state = 'reviewing';
        this.currentItem = item;
        return item;
    }
    /**
     * Get current item being reviewed
     */
    getCurrent() {
        return this.currentItem;
    }
    /**
     * Mark current email as refining (moves to background)
     */
    markRefining(emailId, feedback) {
        const item = this.itemsById.get(emailId);
        if (!item)
            return;
        item.state = 'refining';
        item.refinementFeedback = feedback;
        // Add user feedback to conversation history
        if (!item.conversationHistory) {
            item.conversationHistory = [];
        }
        item.conversationHistory.push({
            type: 'user',
            content: feedback,
            timestamp: new Date()
        });
        // Remove from current
        if (this.currentItem?.email.id === emailId) {
            this.currentItem = null;
        }
    }
    /**
     * Mark email as refined (completed refinement, ready for review)
     */
    markRefined(emailId, refinedDraft) {
        const item = this.itemsById.get(emailId);
        if (!item)
            return;
        item.state = 'refined';
        item.refinedDraft = refinedDraft;
        item.refinementCount = (item.refinementCount || 0) + 1;
        // Add refined draft to conversation history
        if (!item.conversationHistory) {
            item.conversationHistory = [];
        }
        item.conversationHistory.push({
            type: 'refinement',
            content: refinedDraft,
            timestamp: new Date()
        });
        // Update draft with refined content
        if (item.draft) {
            item.draft = {
                ...item.draft,
                draftContent: refinedDraft,
                status: 'pending'
            };
        }
        // Add to refined queue (will be shown next)
        this.refinedQueue.push(item);
    }
    /**
     * Mark email as failed refinement
     */
    markFailed(emailId, error) {
        const item = this.itemsById.get(emailId);
        if (!item)
            return;
        item.state = 'failed';
        // Add back to refined queue so user can see the error
        this.refinedQueue.push(item);
    }
    /**
     * Mark current email as accepted
     */
    markAccepted(emailId) {
        const item = this.itemsById.get(emailId);
        if (!item)
            return;
        item.state = 'accepted';
        if (item.draft) {
            item.draft.status = 'accepted';
        }
        this.completedQueue.push(item);
        // Clear current
        if (this.currentItem?.email.id === emailId) {
            this.currentItem = null;
        }
    }
    /**
     * Mark current email as skipped
     */
    markSkipped(emailId) {
        const item = this.itemsById.get(emailId);
        if (!item)
            return;
        item.state = 'skipped';
        if (item.draft) {
            item.draft.status = 'skipped';
        }
        this.completedQueue.push(item);
        // Clear current
        if (this.currentItem?.email.id === emailId) {
            this.currentItem = null;
        }
    }
    /**
     * Update an item's summary
     */
    updateSummary(emailId, summary) {
        const item = this.itemsById.get(emailId);
        if (item) {
            item.summary = summary;
        }
    }
    /**
     * Update an item's draft
     */
    updateDraft(emailId, draft) {
        const item = this.itemsById.get(emailId);
        if (item) {
            item.draft = draft;
            // Add initial draft to conversation history (only if first time)
            if (!item.conversationHistory) {
                item.conversationHistory = [];
            }
            if (item.conversationHistory.length === 0) {
                item.conversationHistory.push({
                    type: 'draft',
                    content: draft.draftContent,
                    timestamp: new Date()
                });
            }
        }
    }
    /**
     * Get item by email ID
     */
    getItem(emailId) {
        return this.itemsById.get(emailId);
    }
    /**
     * Check if there are more emails to process
     */
    hasMore() {
        return this.primaryQueue.length > 0 || this.refinedQueue.length > 0;
    }
    /**
     * Get queue status for UI display
     */
    getStatus() {
        // Count refining items (not in any queue, but tracked in itemsById)
        let refiningCount = 0;
        for (const item of this.itemsById.values()) {
            if (item.state === 'refining') {
                refiningCount++;
            }
        }
        return {
            primaryRemaining: this.primaryQueue.length,
            refinedWaiting: this.refinedQueue.length,
            completed: this.completedQueue.length,
            refining: refiningCount,
            currentState: this.currentItem?.state
        };
    }
    /**
     * Get all completed items (accepted or skipped)
     */
    getCompleted() {
        return [...this.completedQueue];
    }
    /**
     * Get all accepted drafts
     */
    getAcceptedDrafts() {
        return this.completedQueue
            .filter(item => item.state === 'accepted' && item.draft)
            .map(item => item.draft);
    }
    /**
     * Get items currently being refined
     */
    getRefiningItems() {
        return Array.from(this.itemsById.values())
            .filter(item => item.state === 'refining');
    }
    /**
     * Get total statistics
     */
    getStats() {
        let accepted = 0;
        let skipped = 0;
        let refining = 0;
        let refined = 0;
        let failed = 0;
        for (const item of this.itemsById.values()) {
            if (item.state === 'accepted')
                accepted++;
            else if (item.state === 'skipped')
                skipped++;
            else if (item.state === 'refining')
                refining++;
            else if (item.state === 'refined')
                refined++;
            else if (item.state === 'failed')
                failed++;
        }
        return {
            total: this.itemsById.size,
            processed: accepted + skipped,
            accepted,
            skipped,
            refining,
            refined,
            failed
        };
    }
    /**
     * Reset the queue (for testing)
     */
    reset() {
        this.primaryQueue = [];
        this.refinedQueue = [];
        this.completedQueue = [];
        this.currentItem = null;
        this.itemsById.clear();
    }
}
//# sourceMappingURL=email-queue-manager.js.map