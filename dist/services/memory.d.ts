export declare class MemoryService {
    private claudeMemory;
    loadClaudeMemory(): Promise<string>;
    getMemoryContent(): string;
    hasMemoryLoaded(): boolean;
    getWritingStylePrompt(): string;
    checkClaudeFileExists(): Promise<{
        exists: boolean;
        path?: string;
    }>;
}
//# sourceMappingURL=memory.d.ts.map