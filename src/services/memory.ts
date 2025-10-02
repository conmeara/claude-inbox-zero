import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export class MemoryService {
  private claudeMemory: string = '';
  
  async loadClaudeMemory(): Promise<string> {
    // Try to load CLAUDE.md from current directory first, then from ~/.claude/
    const possiblePaths = [
      path.join(process.cwd(), 'CLAUDE.md'),
      path.join(os.homedir(), '.claude', 'CLAUDE.md'),
      path.join(os.homedir(), 'CLAUDE.md')
    ];

    for (const claudePath of possiblePaths) {
      try {
        const content = await fs.readFile(claudePath, 'utf-8');
        this.claudeMemory = content;
        return content;
      } catch (error) {
        // Continue to next path if file doesn't exist
        continue;
      }
    }

    // No CLAUDE.md found, return empty string
    this.claudeMemory = '';
    return '';
  }

  getMemoryContent(): string {
    return this.claudeMemory;
  }

  hasMemoryLoaded(): boolean {
    return this.claudeMemory.length > 0;
  }

  getWritingStylePrompt(): string {
    if (!this.claudeMemory) {
      return 'Please use a professional but friendly tone.';
    }

    return `Please follow these writing style guidelines from the user's CLAUDE.md:

${this.claudeMemory}

Use this information to match the user's preferred writing style and tone.`;
  }

  async checkClaudeFileExists(): Promise<{ exists: boolean; path?: string }> {
    const possiblePaths = [
      path.join(process.cwd(), 'CLAUDE.md'),
      path.join(os.homedir(), '.claude', 'CLAUDE.md'),
      path.join(os.homedir(), 'CLAUDE.md')
    ];

    for (const claudePath of possiblePaths) {
      try {
        await fs.access(claudePath);
        return { exists: true, path: claudePath };
      } catch (error) {
        continue;
      }
    }

    return { exists: false };
  }
}