import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
export class ConfigService {
    configPath;
    constructor() {
        this.configPath = join(homedir(), '.claude-inbox-config.json');
    }
    loadConfig() {
        try {
            if (existsSync(this.configPath)) {
                const configData = readFileSync(this.configPath, 'utf8');
                return JSON.parse(configData);
            }
        }
        catch (error) {
            console.warn('Failed to load config file, using defaults');
        }
        return {};
    }
    saveConfig(config) {
        try {
            writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    getApiKey() {
        // Check environment variable first
        if (process.env.ANTHROPIC_API_KEY) {
            return process.env.ANTHROPIC_API_KEY;
        }
        // Then check config file
        const config = this.loadConfig();
        return config.anthropicApiKey;
    }
    setApiKey(apiKey) {
        const config = this.loadConfig();
        config.anthropicApiKey = apiKey;
        this.saveConfig(config);
    }
    hasApiKey() {
        return !!this.getApiKey();
    }
    clearApiKey() {
        const config = this.loadConfig();
        delete config.anthropicApiKey;
        this.saveConfig(config);
    }
    /**
     * Get concurrency setting from environment or default to 10
     * Controls how many emails can be processed in parallel
     */
    getConcurrency() {
        const envValue = process.env.CLAUDE_INBOX_CONCURRENCY;
        if (envValue) {
            const parsed = parseInt(envValue, 10);
            if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
                return parsed;
            }
        }
        return 10; // Default to 10 concurrent emails
    }
}
//# sourceMappingURL=config.js.map