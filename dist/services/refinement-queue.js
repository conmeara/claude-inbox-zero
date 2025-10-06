import { MessageQueue } from './message-queue.js';
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
export class RefinementQueue {
    sessionManager;
    agentClient;
    jobs = new Map();
    processing = new Set();
    maxConcurrent;
    onCompleteCallbacks = [];
    onFailedCallbacks = [];
    // MessageQueue per email to serialize refinements for same email
    emailQueues = new Map();
    constructor(sessionManager, agentClient, maxConcurrent = 3) {
        this.sessionManager = sessionManager;
        this.agentClient = agentClient;
        this.maxConcurrent = maxConcurrent;
    }
    /**
     * Get or create a MessageQueue for an email
     */
    getOrCreateQueue(emailId) {
        let queue = this.emailQueues.get(emailId);
        if (!queue) {
            queue = new MessageQueue();
            this.emailQueues.set(emailId, queue);
            // Start a worker for this email (processes jobs serially)
            this.startEmailWorker(emailId, queue);
        }
        return queue;
    }
    /**
     * Worker loop for a specific email
     * Processes refinements serially to prevent race conditions
     */
    async startEmailWorker(emailId, queue) {
        while (true) {
            const next = await queue.next();
            if (next.done)
                break;
            const job = next.value;
            // Wait until we have an available processing slot
            while (this.processing.size >= this.maxConcurrent) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            // Mark as processing
            this.processing.add(emailId);
            try {
                await this.processJob(job);
            }
            finally {
                this.processing.delete(emailId);
            }
        }
        // Cleanup queue when worker exits
        this.emailQueues.delete(emailId);
    }
    /**
     * Enqueue a refinement job
     * Jobs for the same email are processed serially (prevents race conditions)
     * Jobs for different emails can process concurrently (up to maxConcurrent)
     */
    async enqueue(emailId, currentDraft, feedback, email) {
        const job = {
            emailId,
            currentDraft,
            feedback,
            email,
            status: 'queued'
        };
        this.jobs.set(emailId, job);
        // Get or create queue for this email
        const queue = this.getOrCreateQueue(emailId);
        // Push to the queue (will be processed serially for this email)
        await queue.push(job);
    }
    /**
     * Process a single refinement job
     */
    async processJob(job) {
        try {
            // Get or create session for this email
            const session = this.sessionManager.getOrCreateSession(job.emailId);
            // Increment turn count
            this.sessionManager.incrementTurn(job.emailId);
            // Build prompt for refinement
            const prompt = this.buildRefinementPrompt(job.email, job.currentDraft, job.feedback, session.turnCount);
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
        }
        catch (error) {
            job.status = 'failed';
            job.error = error;
            job.endTime = Date.now();
            console.error(`Refinement failed for ${job.emailId}:`, error);
            // Notify listeners
            this.notifyFailed(job.emailId, error);
        }
    }
    /**
     * Build refinement prompt
     */
    buildRefinementPrompt(email, currentDraft, feedback, turnCount) {
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
    onComplete(callback) {
        this.onCompleteCallbacks.push(callback);
    }
    /**
     * Register callback for failed refinements
     */
    onFailed(callback) {
        this.onFailedCallbacks.push(callback);
    }
    /**
     * Notify all listeners of completion
     */
    notifyComplete(emailId, result, job) {
        this.onCompleteCallbacks.forEach(cb => {
            try {
                cb(emailId, result, job);
            }
            catch (error) {
                console.error('Error in onComplete callback:', error);
            }
        });
    }
    /**
     * Notify all listeners of failure
     */
    notifyFailed(emailId, error) {
        this.onFailedCallbacks.forEach(cb => {
            try {
                cb(emailId, error);
            }
            catch (err) {
                console.error('Error in onFailed callback:', err);
            }
        });
    }
    /**
     * Get count of pending jobs (queued + processing)
     */
    getPendingCount() {
        return Array.from(this.jobs.values())
            .filter(j => j.status === 'queued' || j.status === 'processing')
            .length;
    }
    /**
     * Get count of jobs currently processing
     */
    getProcessingCount() {
        return this.processing.size;
    }
    /**
     * Get a specific job
     */
    getJob(emailId) {
        return this.jobs.get(emailId);
    }
    /**
     * Get all jobs with a specific status
     */
    getJobsByStatus(status) {
        return Array.from(this.jobs.values())
            .filter(j => j.status === status);
    }
    /**
     * Remove a completed or failed job
     */
    removeJob(emailId) {
        const job = this.jobs.get(emailId);
        if (job && (job.status === 'complete' || job.status === 'failed')) {
            this.jobs.delete(emailId);
        }
    }
    /**
     * Clear all completed and failed jobs
     */
    clearCompletedJobs() {
        for (const [emailId, job] of this.jobs) {
            if (job.status === 'complete' || job.status === 'failed') {
                this.jobs.delete(emailId);
            }
        }
    }
    /**
     * Get total cost of all refinements
     */
    getTotalCost() {
        let total = 0;
        for (const job of this.jobs.values()) {
            total += job.cost || 0;
        }
        return total;
    }
    /**
     * Cleanup the queue and close all message queues
     */
    cleanup() {
        // Close all message queues to stop workers
        for (const queue of this.emailQueues.values()) {
            queue.close();
        }
        this.jobs.clear();
        this.processing.clear();
        this.emailQueues.clear();
        this.onCompleteCallbacks = [];
        this.onFailedCallbacks = [];
    }
}
//# sourceMappingURL=refinement-queue.js.map