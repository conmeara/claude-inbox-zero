import { type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { EmailService } from './email-service.js';
export interface AgentQueryOptions {
    maxTurns?: number;
    cwd?: string;
    model?: string;
    allowedTools?: string[];
    appendSystemPrompt?: string;
    resume?: string;
    hooks?: any;
    mcpServers?: any;
}
/**
 * AgentClient - Wrapper around Claude Agent SDK with custom MCP tools
 * Based on sample's ai-client.ts and custom-tools.ts patterns
 */
export declare class AgentClient {
    private inboxService;
    private customTools;
    private defaultOptions;
    constructor(inboxService: EmailService);
    /**
     * Create custom MCP tools for inbox operations
     * Pattern from sample's custom-tools.ts
     */
    private createCustomTools;
    /**
     * Create PreToolUse hooks for validation and security
     * Pattern from Anthropic sample's ai-client.ts
     */
    private createHooks;
    /**
     * System prompt for email draft refinement
     */
    private getSystemPrompt;
    /**
     * Stream a query to Claude Agent SDK
     * Pattern from sample's ai-client.ts
     */
    queryStream(prompt: string, options?: Partial<AgentQueryOptions>): AsyncIterable<SDKMessage>;
    /**
     * Query and collect all messages (non-streaming)
     * Useful for simple requests
     */
    querySingle(prompt: string, options?: Partial<AgentQueryOptions>): Promise<{
        result: string;
        messages: SDKMessage[];
        cost: number;
        duration: number;
    }>;
}
//# sourceMappingURL=agent-client.d.ts.map