import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { EmailSession } from './session-manager.js';

/**
 * Session Persistence - Save/load email draft sessions to disk
 * Allows continuing refinement conversations after app restart
 */
export class SessionPersistence {
  private sessionsPath: string;
  private sessionsDir: string;

  constructor() {
    this.sessionsDir = path.join(os.homedir(), '.claude-inbox', 'sessions');
    this.sessionsPath = path.join(this.sessionsDir, 'sessions.json');

    // Ensure directory exists
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Save a session to disk
   */
  async saveSession(emailId: string, session: EmailSession): Promise<void> {
    try {
      // Load existing sessions
      const sessions = await this.loadAllSessions();

      // Update or add this session
      sessions[emailId] = {
        sessionId: session.sessionId,
        emailId: session.emailId,
        turnCount: session.turnCount,
        totalCost: session.totalCost,
        totalDuration: session.totalDuration,
        // Don't save messageHistory (can get large)
        messageHistory: []
      };

      // Write back to file
      fs.writeFileSync(this.sessionsPath, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error(`Failed to save session for ${emailId}:`, error);
    }
  }

  /**
   * Load a session from disk
   */
  async loadSession(emailId: string): Promise<EmailSession | null> {
    try {
      const sessions = await this.loadAllSessions();
      return sessions[emailId] || null;
    } catch (error) {
      console.error(`Failed to load session for ${emailId}:`, error);
      return null;
    }
  }

  /**
   * Load all sessions from disk
   */
  private async loadAllSessions(): Promise<Record<string, EmailSession>> {
    try {
      if (!fs.existsSync(this.sessionsPath)) {
        return {};
      }

      const content = fs.readFileSync(this.sessionsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load sessions file:', error);
      return {};
    }
  }

  /**
   * Delete a session from disk
   */
  async deleteSession(emailId: string): Promise<void> {
    try {
      const sessions = await this.loadAllSessions();
      delete sessions[emailId];
      fs.writeFileSync(this.sessionsPath, JSON.stringify(sessions, null, 2));
    } catch (error) {
      console.error(`Failed to delete session for ${emailId}:`, error);
    }
  }

  /**
   * Clear all sessions
   */
  async clearAll(): Promise<void> {
    try {
      fs.writeFileSync(this.sessionsPath, JSON.stringify({}, null, 2));
    } catch (error) {
      console.error('Failed to clear sessions:', error);
    }
  }

  /**
   * Get total cost across all saved sessions
   */
  async getTotalCost(): Promise<number> {
    const sessions = await this.loadAllSessions();
    let total = 0;
    for (const session of Object.values(sessions)) {
      total += session.totalCost;
    }
    return total;
  }

  /**
   * Get session metrics summary
   */
  async getMetrics(): Promise<{
    totalSessions: number;
    totalCost: number;
    totalTurns: number;
    avgCostPerSession: number;
  }> {
    const sessions = await this.loadAllSessions();
    const sessionList = Object.values(sessions);

    const totalCost = sessionList.reduce((sum, s) => sum + s.totalCost, 0);
    const totalTurns = sessionList.reduce((sum, s) => sum + s.turnCount, 0);

    return {
      totalSessions: sessionList.length,
      totalCost,
      totalTurns,
      avgCostPerSession: sessionList.length > 0 ? totalCost / sessionList.length : 0
    };
  }
}
