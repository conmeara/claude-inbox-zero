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
 * Based on sample implementation but simplified for CLI use
 */
export declare class SessionManager {
    private sessions;
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
     * Destroy a session and free memory
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