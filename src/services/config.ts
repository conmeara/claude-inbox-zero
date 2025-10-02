import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface Config {
  anthropicApiKey?: string;
}

export class ConfigService {
  private configPath: string;

  constructor() {
    this.configPath = join(homedir(), '.claude-inbox-config.json');
  }

  loadConfig(): Config {
    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf8');
        return JSON.parse(configData);
      }
    } catch (error) {
      console.warn('Failed to load config file, using defaults');
    }
    return {};
  }

  saveConfig(config: Config): void {
    try {
      writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getApiKey(): string | undefined {
    // Check environment variable first
    if (process.env.ANTHROPIC_API_KEY) {
      return process.env.ANTHROPIC_API_KEY;
    }

    // Then check config file
    const config = this.loadConfig();
    return config.anthropicApiKey;
  }

  setApiKey(apiKey: string): void {
    const config = this.loadConfig();
    config.anthropicApiKey = apiKey;
    this.saveConfig(config);
  }

  hasApiKey(): boolean {
    return !!this.getApiKey();
  }

  clearApiKey(): void {
    const config = this.loadConfig();
    delete config.anthropicApiKey;
    this.saveConfig(config);
  }
}