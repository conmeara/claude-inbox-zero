import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
export interface EmailSession {
    sessionId: string | null;
    emailId: string;
    turnCount: number;
    messageHistory: SDKMessage[];
    totalCost: number;
    totalDuration: number;
}
/**
 * SessionManager - Manages one session per email for multi-turn conversations
 *
 * Features:
 * - Memory-only sessions (no disk persistence)
 * - Cost and turn tracking for limits
 * - Session cleanup to prevent memory leaks
 *
 * Based on patterns from Anthropic's email-agent sample.
 */
export declare class SessionManager {
    private sessions;
    constructor();
    /**
     * Create a new session for an email
     */
    createSession(emailId: string): EmailSession;
    /**
     * Get an existing session
     */
    getSession(emailId: string): EmailSession | undefined;
    /**
     * Get or create a session
     */
    getOrCreateSession(emailId: string): EmailSession;
    /**
     * Update session with SDK message
     */
    updateSession(emailId: string, message: SDKMessage): void;
    /**
     * Increment turn count for a session
     */
    incrementTurn(emailId: string): void;
    /**
     * Get the total number of turns for a session
     */
    getTurnCount(emailId: string): number;
    /**
     * Check if session has reached max turns
     */
    hasReachedMaxTurns(emailId: string, maxTurns?: number): boolean;
    /**
     * Get session metrics
     */
    getSessionMetrics(emailId: string): {
        cost: number;
        duration: number;
        turns: number;
    } | null;
    /**
     * Finalize a session after email is processed (cleanup memory)
     * This should be called after user sends/skips an email
     */
    finalizeSession(emailId: string): void;
    /**
     * Destroy a session completely and free all memory
     * Use this when a session is no longer needed at all
     */
    destroySession(emailId: string): void;
    /**
     * Get all active session IDs
     */
    getActiveSessions(): string[];
    /**
     * Get total cost across all sessions
     */
    getTotalCost(): number;
    /**
     * Cleanup all sessions
     */
    cleanup(): void;
}
//# sourceMappingURL=session-manager.d.ts.map