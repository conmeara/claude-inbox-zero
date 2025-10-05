import { query, createSdkMcpServer, tool, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { MockInboxService } from './mockInbox.js';
import * as path from 'path';

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
export class AgentClient {
  private inboxService: MockInboxService;
  private customTools: ReturnType<typeof createSdkMcpServer>;
  private defaultOptions: AgentQueryOptions;

  constructor(inboxService: MockInboxService) {
    this.inboxService = inboxService;
    this.customTools = this.createCustomTools();
    this.defaultOptions = {
      maxTurns: 100,
      cwd: path.join(process.cwd(), '.claude'),
      model: 'sonnet',
      allowedTools: [
        'Task', 'Bash', 'Glob', 'Grep', 'Read', 'Edit', 'MultiEdit', 'Write',
        'WebFetch', 'TodoWrite', 'WebSearch', 'BashOutput', 'KillBash',
        'mcp__inbox__search_inbox',
        'mcp__inbox__read_email',
        'mcp__inbox__read_emails',
        'mcp__inbox__list_unread'
      ],
      appendSystemPrompt: this.getSystemPrompt(),
      hooks: this.createHooks()
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
          'Search emails using Gmail query syntax (works with both Mock and Gmail)',
          {
            gmailQuery: z.string().describe(`Gmail query string (e.g., 'from:sender@example.com subject:invoice newer_than:7d')
Supported operators:
- from:email - Emails from specific sender
- to:email - Emails to specific recipient
- subject:keyword - Search in subject line
- has:attachment - Emails with attachments
- is:unread - Unread emails
- newer_than:7d - Emails from last 7 days
- older_than:1m - Emails older than 1 month
- OR - Match either term: (invoice OR receipt)
- AND - Match both terms (space implies AND)
- "" - Exact phrase: "quarterly report"
- - - Exclude: invoice -draft`),
            limit: z.number().optional().describe('Maximum number of emails to return (default: 30)')
          },
          async (args) => {
            try {
              // Check if inbox service supports Gmail queries (GmailService)
              const hasSearchWithLogs = 'searchWithLogs' in this.inboxService;

              if (hasSearchWithLogs) {
                // Use log file pattern for Gmail
                const result = await (this.inboxService as any).searchWithLogs(args.gmailQuery);

                return {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      totalResults: result.totalResults,
                      logFilePath: result.logFilePath,
                      ids: result.ids,
                      message: `Full email search results written to ${result.logFilePath}. Use Read or Grep tools to analyze the log file.`
                    }, null, 2)
                  }]
                };
              } else {
                // Fallback for MockInboxService - simple search
                const results = await this.inboxService.search({ gmailQuery: args.gmailQuery } as any);
                const limit = args.limit || 30;
                const limited = results.slice(0, limit);

                return {
                  content: [{
                    type: 'text',
                    text: JSON.stringify({
                      totalResults: results.length,
                      showing: limited.length,
                      emails: limited.map(email => ({
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
              }
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
          'read_emails',
          'Read multiple emails by their IDs to get full content and details (batch operation)',
          {
            ids: z.array(z.string()).describe('Array of email IDs to fetch (e.g., ["id1", "id2", "id3"])')
          },
          async (args) => {
            try {
              // Check if inbox service supports batch read (GmailService)
              const hasBatchRead = 'getByIds' in this.inboxService;

              let emails;
              if (hasBatchRead) {
                emails = await (this.inboxService as any).getByIds(args.ids);
              } else {
                // Fallback: fetch one by one
                emails = [];
                for (const id of args.ids) {
                  const email = await this.inboxService.getById(id);
                  if (email) {
                    emails.push(email);
                  }
                }
              }

              const formattedResults = emails.map((email, index) => ({
                index: index + 1,
                id: email.id,
                from: {
                  name: email.from.name,
                  email: email.from.email
                },
                subject: email.subject,
                date: email.date,
                body: email.body,
                requiresResponse: email.requiresResponse,
                unread: email.unread
              }));

              return {
                content: [{
                  type: 'text',
                  text: JSON.stringify({
                    totalFetched: formattedResults.length,
                    emails: formattedResults
                  }, null, 2)
                }]
              };
            } catch (error: any) {
              return {
                content: [{
                  type: 'text',
                  text: `Error reading emails: ${error.message}`
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
   * Create PreToolUse hooks for validation and security
   * Pattern from Anthropic sample's ai-client.ts
   */
  private createHooks() {
    return {
      PreToolUse: [
        {
          matcher: "Write|Edit|MultiEdit",
          hooks: [
            async (input: any) => {
              const toolName = input.tool_name;
              const toolInput = input.tool_input;

              if (!['Write', 'Edit', 'MultiEdit'].includes(toolName)) {
                return { continue: true };
              }

              let filePath = '';
              if (toolName === 'Write' || toolName === 'Edit') {
                filePath = toolInput.file_path || '';
              } else if (toolName === 'MultiEdit') {
                filePath = toolInput.file_path || '';
              }

              // Prevent writing to critical system files
              const restrictedPaths = [
                '/etc/',
                '/usr/',
                '/bin/',
                '/sbin/',
                '/System/',
                'package.json',
                'package-lock.json',
                'tsconfig.json'
              ];

              for (const restricted of restrictedPaths) {
                if (filePath.includes(restricted)) {
                  return {
                    decision: 'block',
                    stopReason: `Cannot modify system or config file: ${filePath}. This file is restricted for safety.`,
                    continue: false
                  };
                }
              }

              // Only allow writing to project directories
              const allowedDirectories = [
                'src/',
                'mock-data/',
                '.claude/',
                'logs/'
              ];

              const isInAllowedDir = allowedDirectories.some(dir => filePath.includes(dir));

              if (!isInAllowedDir && filePath) {
                return {
                  decision: 'block',
                  stopReason: `Files should be written to allowed directories: ${allowedDirectories.join(', ')}. Attempted: ${filePath}`,
                  continue: false
                };
              }

              return { continue: true };
            }
          ]
        }
      ]
    };
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
