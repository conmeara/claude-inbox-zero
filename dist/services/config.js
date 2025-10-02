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
}
//# sourceMappingURL=config.js.map