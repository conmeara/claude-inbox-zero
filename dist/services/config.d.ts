export interface Config {
    anthropicApiKey?: string;
}
export declare class ConfigService {
    private configPath;
    constructor();
    loadConfig(): Config;
    saveConfig(config: Config): void;
    getApiKey(): string | undefined;
    setApiKey(apiKey: string): void;
    hasApiKey(): boolean;
    clearApiKey(): void;
    /**
     * Get concurrency setting from environment or default to 10
     * Controls how many emails can be processed in parallel
     */
    getConcurrency(): number;
}
//# sourceMappingURL=config.d.ts.map