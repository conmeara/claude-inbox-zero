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
}
//# sourceMappingURL=config.d.ts.map