import { query, createSdkMcpServer, tool, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { MockInboxService } from './mockInbox.js';

export interface AgentQueryOptions {
  maxTurns?: number;
  model?: string;
  allowedTools?: string[];
  appendSystemPrompt?: string;
  resume?: string;
}

/**
 * AgentClient - Wrapper around Claude Agent SDK with custom MCP tools
 * Based on sample's ai-client.ts and custom-tools.ts patterns
 */
export class AgentClient {
  private inboxService: MockInboxService;
  private customTools: ReturnType<typeof createSdkMcpServer>;
  private defaultOptions: AgentQueryOptions;

  constructor(inboxService: MockInboxService) {
    this.inboxService = inboxService;
    this.customTools = this.createCustomTools();
    this.defaultOptions = {
      maxTurns: 10,
      model: 'sonnet',
      allowedTools: [
        'Read', 'Grep', 'Glob',
        'mcp__inbox__search_inbox',
        'mcp__inbox__read_email',
        'mcp__inbox__list_unread'
      ],
      appendSystemPrompt: this.getSystemPrompt()
    };
  }

  /**
   * Create custom MCP tools for inbox operations
   * Pattern from sample's custom-tools.ts
   */
  private createCustomTools() {
    return createSdkMcpServer({
      name: 'inbox',
      version: '1.0.0',
      tools: [
        tool(
          'search_inbox',
          'Search emails in the mock inbox by sender, subject, or content',
          {
            query: z.string().optional().describe('Search query to match in subject or body'),
            from: z.string().optional().describe('Filter by sender name or email'),
            requiresResponse: z.boolean().optional().describe('Filter by whether email requires response')
          },
          async (args) => {
            try {
              const results = await this.inboxService.search({
                query: args.query,
                from: args.from,
                requiresResponse: args.requiresResponse
              });

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    totalResults: results.length,
                    emails: results.map(email => ({
                      id: email.id,
                      from: `${email.from.name} <${email.from.email}>`,
                      subject: email.subject,
                      date: email.date,
                      requiresResponse: email.requiresResponse,
                      snippet: email.body.substring(0, 150) + '...'
                    }))
                  }, null, 2)
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error searching inbox: ${error.message}`
                }]
              };
            }
          }
        ),

        tool(
          'read_email',
          'Get full details of a specific email by ID',
          {
            emailId: z.string().describe('The email ID to read')
          },
          async (args) => {
            try {
              const email = await this.inboxService.getById(args.emailId);

              if (!email) {
                return {
                  content: [{
                    type: 'text',
                    text: `Email with ID ${args.emailId} not found`
                  }]
                };
              }

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    id: email.id,
                    from: {
                      name: email.from.name,
                      email: email.from.email
                    },
                    subject: email.subject,
                    date: email.date,
                    body: email.body,
                    requiresResponse: email.requiresResponse
                  }, null, 2)
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error reading email: ${error.message}`
                }]
              };
            }
          }
        ),

        tool(
          'list_unread',
          'Get a list of all unread emails',
          {
            limit: z.number().optional().describe('Maximum number of emails to return (default: 25)')
          },
          async (args) => {
            try {
              const unread = await this.inboxService.getUnreadEmails();
              const limit = args.limit || 25;
              const limited = unread.slice(0, limit);

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    totalUnread: unread.length,
                    showing: limited.length,
                    emails: limited.map(email => ({
                      id: email.id,
                      from: `${email.from.name} <${email.from.email}>`,
                      subject: email.subject,
                      date: email.date,
                      requiresResponse: email.requiresResponse
                    }))
                  }, null, 2)
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error listing unread emails: ${error.message}`
                }]
              };
            }
          }
        )
      ]
    });
  }

  /**
   * System prompt for email draft refinement
   */
  private getSystemPrompt(): string {
    return `You are helping refine email drafts based on user feedback.

When user requests changes:
- Make specific improvements based on their feedback
- Maintain professional tone unless asked otherwise
- Keep replies concise (2-4 sentences) unless more detail is requested
- You have access to inbox tools to search for context or reference other emails

Available tools:
- search_inbox: Search for emails by sender, subject, or content
- read_email: Get full details of a specific email by ID
- list_unread: Get all unread emails

Examples of good refinements:
- "make this more formal" → increase formality, use proper titles
- "shorter" → condense to key points only
- "add urgency" → emphasize time sensitivity, suggest action
- "more friendly" → warm greeting, less corporate language`;
  }

  /**
   * Stream a query to Claude Agent SDK
   * Pattern from sample's ai-client.ts
   */
  async *queryStream(
    prompt: string,
    options?: Partial<AgentQueryOptions>
  ): AsyncIterable<SDKMessage> {
    const mergedOptions = { ...this.defaultOptions, ...options };

    // Add custom MCP tools
    const queryOptions: any = {
      maxTurns: mergedOptions.maxTurns,
      model: mergedOptions.model,
      allowedTools: mergedOptions.allowedTools,
      appendSystemPrompt: mergedOptions.appendSystemPrompt,
      mcpServers: {
        inbox: this.customTools
      }
    };

    // Add resume option if provided (for multi-turn)
    if (mergedOptions.resume) {
      queryOptions.resume = mergedOptions.resume;
    }

    for await (const message of query({
      prompt,
      options: queryOptions
    })) {
      yield message;
    }
  }

  /**
   * Query and collect all messages (non-streaming)
   * Useful for simple requests
   */
  async querySingle(
    prompt: string,
    options?: Partial<AgentQueryOptions>
  ): Promise<{
    result: string;
    messages: SDKMessage[];
    cost: number;
    duration: number;
  }> {
    const messages: SDKMessage[] = [];
    let result = '';
    let totalCost = 0;
    let duration = 0;

    for await (const message of this.queryStream(prompt, options)) {
      messages.push(message);

      if (message.type === 'result' && message.subtype === 'success') {
        result = message.result;
        totalCost = message.total_cost_usd || 0;
        duration = message.duration_ms || 0;
      }
    }

    return { result, messages, cost: totalCost, duration };
  }
}
