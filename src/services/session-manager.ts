import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { Email } from '../types/email.js';
import { SessionPersistence } from './session-persistence.js';

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
 * Now with disk persistence for session recovery
 */
export class SessionManager {
  private sessions: Map<string, EmailSession> = new Map();
  private persistence: SessionPersistence;

  constructor() {
    this.persistence = new SessionPersistence();
  }

  /**
   * Create a new session for an email
   */
  createSession(emailId: string): EmailSession {
    const session: EmailSession = {
      sessionId: null,
      emailId,
      turnCount: 0,
      messageHistory: [],
      totalCost: 0,
      totalDuration: 0
    };

    this.sessions.set(emailId, session);
    return session;
  }

  /**
   * Get an existing session
   */
  getSession(emailId: string): EmailSession | undefined {
    return this.sessions.get(emailId);
  }

  /**
   * Get or create a session (tries to load from disk first)
   */
  async getOrCreateSession(emailId: string): Promise<EmailSession> {
    let session = this.getSession(emailId);

    if (!session) {
      // Try to load from disk
      const loadedSession = await this.persistence.loadSession(emailId);

      if (loadedSession) {
        // Restore from disk
        this.sessions.set(emailId, loadedSession);
        session = loadedSession;
      } else {
        // Create new
        session = this.createSession(emailId);
      }
    }

    return session;
  }

  /**
   * Update session with SDK message (and persist to disk)
   */
  async updateSession(emailId: string, message: SDKMessage): Promise<void> {
    const session = this.getSession(emailId);
    if (!session) return;

    session.messageHistory.push(message);

    // Capture session ID on init
    if (message.type === 'system' && message.subtype === 'init') {
      session.sessionId = message.session_id;
    }

    // Track cost and duration
    if (message.type === 'result' && message.subtype === 'success') {
      session.totalCost += message.total_cost_usd || 0;
      session.totalDuration += message.duration_ms || 0;

      // Persist session metrics after each completion
      await this.persistence.saveSession(emailId, session);
    }
  }

  /**
   * Increment turn count for a session
   */
  incrementTurn(emailId: string): void {
    const session = this.getSession(emailId);
    if (session) {
      session.turnCount++;
    }
  }

  /**
   * Get the total number of turns for a session
   */
  getTurnCount(emailId: string): number {
    const session = this.getSession(emailId);
    return session?.turnCount || 0;
  }

  /**
   * Check if session has reached max turns
   */
  hasReachedMaxTurns(emailId: string, maxTurns: number = 10): boolean {
    return this.getTurnCount(emailId) >= maxTurns;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(emailId: string): { cost: number; duration: number; turns: number } | null {
    const session = this.getSession(emailId);
    if (!session) return null;

    return {
      cost: session.totalCost,
      duration: session.totalDuration,
      turns: session.turnCount
    };
  }

  /**
   * Destroy a session and free memory (also removes from disk)
   */
  async destroySession(emailId: string): Promise<void> {
    const session = this.sessions.get(emailId);
    if (session) {
      session.messageHistory = [];
      this.sessions.delete(emailId);
      await this.persistence.deleteSession(emailId);
    }
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Get total cost across all sessions
   */
  getTotalCost(): number {
    let total = 0;
    for (const session of this.sessions.values()) {
      total += session.totalCost;
    }
    return total;
  }

  /**
   * Cleanup all sessions (keeps disk persistence)
   */
  cleanup(): void {
    for (const session of this.sessions.values()) {
      session.messageHistory = [];
    }
    this.sessions.clear();
  }

  /**
   * Get persistence service for advanced operations
   */
  getPersistence(): SessionPersistence {
    return this.persistence;
  }
}
