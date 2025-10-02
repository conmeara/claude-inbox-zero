import { Email, EmailSummary, EmailDraft } from '../types/email.js';
import { AgentClient } from './agent-client.js';
import { SessionManager } from './session-manager.js';
import { MockInboxService } from './mockInbox.js';
import { ConfigService } from './config.js';
import { MemoryService } from './memory.js';
import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';

export class AIService {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private configService: ConfigService;
  private memoryService: MemoryService;
  private agentClient: AgentClient;
  private sessionManager: SessionManager;
  private systemPrompt: string = '';
  private onProgress?: (message: string) => void;

  constructor(inboxService: MockInboxService) {
    this.configService = new ConfigService();
    this.memoryService = new MemoryService();
    this.agentClient = new AgentClient(inboxService);
    this.sessionManager = new SessionManager();
  }

  async initialize(): Promise<void> {
    // Load CLAUDE.md for personalized writing style
    await this.memoryService.loadClaudeMemory();

    // Build system prompt with user's writing style
    this.systemPrompt = this.buildSystemPrompt();
  }

  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  getAgentClient(): AgentClient {
    return this.agentClient;
  }

  setProgressCallback(callback: (message: string) => void): void {
    this.onProgress = callback;
  }

  private buildSystemPrompt(): string {
    const basePrompt = `You are Claude Inbox, an AI assistant helping to process emails efficiently.

Your tasks:
1. Summarize emails concisely (1-2 sentences focusing on key actions and urgency)
2. Draft professional, contextual email replies
3. Match the user's writing style and preferences

`;

    if (this.memoryService.hasMemoryLoaded()) {
      return basePrompt + this.memoryService.getWritingStylePrompt();
    }

    return basePrompt + 'Use a professional yet friendly tone in all communications.';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async callClaude(prompt: string, retries = 0, onProgress?: (message: string) => void): Promise<string> {
    // Check if we have an API key available
    if (!this.configService.hasApiKey()) {
      throw new Error('No Anthropic API key available. Use --setup to configure or set ANTHROPIC_API_KEY environment variable.');
    }

    try {
      let response = '';

      // Include system prompt
      const fullPrompt = this.systemPrompt ? `${this.systemPrompt}\n\n${prompt}` : prompt;

      // Use AgentClient for querying
      for await (const message of this.agentClient.queryStream(fullPrompt, { maxTurns: 1 })) {
        // Stream progress messages to the UI
        if (onProgress && message.type === 'system' && message.subtype === 'init') {
          onProgress?.('Initializing Claude...');
        } else if (onProgress && message.type === 'assistant') {
          onProgress?.('Processing response...');
        }

        // Extract result
        if (message.type === 'result' && message.subtype === 'success') {
          response = message.result;
          onProgress?.('Response complete');
        }
      }

      if (!response) {
        throw new Error('No response received from Claude Agent SDK');
      }

      return response.trim();
    } catch (error) {
      if (retries < this.maxRetries) {
        console.warn(`Claude API call failed, retrying (${retries + 1}/${this.maxRetries})...`);
        await this.delay(this.retryDelay * (retries + 1)); // Exponential backoff
        return this.callClaude(prompt, retries + 1, onProgress);
      }
      throw error;
    }
  }

  async testApiKey(): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.configService.hasApiKey()) {
        return {
          success: false,
          message: 'No API key configured. Use --setup to add your Anthropic API key.'
        };
      }

      const testResponse = await this.callClaude('Reply with exactly: "API test successful"');
      
      if (testResponse.toLowerCase().includes('api test successful')) {
        return {
          success: true,
          message: 'API key is valid and working!'
        };
      } else {
        return {
          success: false,
          message: `API key connected but received unexpected response: "${testResponse}"`
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `API key test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  hasApiKey(): boolean {
    return this.configService.hasApiKey();
  }
  
  async summarizeEmailBatch(emails: Email[]): Promise<EmailSummary[]> {
    try {
      this.onProgress?.('Analyzing all emails...');
      
      // Build a single prompt for all emails
      const batchPrompt = this.buildBatchSummaryPrompt(emails);
      
      // Get all summaries in one API call
      const response = await this.callClaude(batchPrompt);
      
      // Parse the batch response
      return this.parseBatchSummaries(emails, response);
    } catch (error) {
      console.error('Batch summarization failed:', error);
      
      // Fallback to individual processing if batch fails
      this.onProgress?.('Falling back to individual processing...');
      return this.summarizeEmailsIndividually(emails);
    }
  }

  private buildBatchSummaryPrompt(emails: Email[]): string {
    const emailList = emails.map((email, index) => `
Email ${index + 1}:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.date}
Content: ${email.body}`).join('\n---\n');

    return `Please analyze the following ${emails.length} emails and provide a concise summary for each one. 

For each email, write a 1-2 sentence summary focusing on:
- The main purpose or request
- Any action items or deadlines
- The urgency level

Format your response as a numbered list matching the email numbers.

Emails to summarize:
${emailList}

Provide summaries in this exact format:
1. [Summary for email 1]
2. [Summary for email 2]
... and so on`;
  }

  private parseBatchSummaries(emails: Email[], response: string): EmailSummary[] {
    const summaries: EmailSummary[] = [];
    const lines = response.split('\n').filter(line => line.trim());
    
    for (let i = 0; i < emails.length; i++) {
      const summaryLine = lines.find(line => line.startsWith(`${i + 1}.`));
      if (summaryLine) {
        const summary = summaryLine.replace(/^\d+\.\s*/, '').trim();
        summaries.push({
          emailId: emails[i].id,
          summary
        });
      } else {
        // Fallback if parsing fails
        summaries.push({
          emailId: emails[i].id,
          summary: `${emails[i].from.name} - ${emails[i].subject}`
        });
      }
    }
    
    return summaries;
  }

  private async summarizeEmailsIndividually(emails: Email[]): Promise<EmailSummary[]> {
    const summaries: EmailSummary[] = [];
    
    for (let i = 0; i < emails.length; i++) {
      this.onProgress?.(`Processing email ${i + 1} of ${emails.length}...`);
      
      try {
        const summary = await this.summarizeEmail(emails[i]);
        summaries.push({
          emailId: emails[i].id,
          summary
        });
      } catch (error) {
        console.error(`Failed to summarize email ${emails[i].id}:`, error);
        summaries.push({
          emailId: emails[i].id,
          summary: `Error summarizing: ${emails[i].subject}`
        });
      }
    }
    
    return summaries;
  }

  async summarizeEmail(email: Email): Promise<string> {
    try {
      const prompt = `Please analyze this email and provide a concise 1-2 sentence summary focusing on the key action items, purpose, and urgency level:

From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.date}

Email Content:
${email.body}

Provide only the summary, no additional formatting or explanations.`;

      return await this.callClaude(prompt);
    } catch (error) {
      console.error(`Claude API error for email ${email.id}:`, error);
      
      // Fallback to pattern matching if Claude API fails
      const subject = email.subject.toLowerCase();
      const body = email.body.toLowerCase();
      
      if (subject.includes('timeline') || subject.includes('schedule')) {
        return `${email.from.name} is requesting an updated project timeline and delivery schedule.`;
      } else if (subject.includes('newsletter') || subject.includes('digest')) {
        return `Newsletter/digest email from ${email.from.name} - informational content only.`;
      } else if (subject.includes('reminder') || body.includes('reminder')) {
        return `${email.from.name} is sending a reminder about upcoming deadlines or tasks.`;
      } else if (subject.includes('feedback') || subject.includes('review')) {
        return `${email.from.name} is sharing feedback or requesting review of work/documents.`;
      } else if (subject.includes('invoice') || subject.includes('payment')) {
        return `${email.from.name} is following up on billing/payment related matters.`;
      } else if (subject.includes('meeting') || subject.includes('interview')) {
        return `${email.from.name} is scheduling or following up on meeting/interview arrangements.`;
      } else if (subject.includes('question') || body.includes('?')) {
        return `${email.from.name} has questions that need answers or clarification.`;
      } else {
        return `${email.from.name} sent a message regarding "${email.subject}".`;
      }
    }
  }

  async generateEmailDraft(email: Email): Promise<string> {
    // Skip drafting for emails that don't require a response
    if (!email.requiresResponse) {
      return '';
    }

    try {
      const prompt = `Please write a professional email reply to this message. The reply should be:
- Professional and courteous
- Appropriate to the context and urgency
- Include specific action items or next steps when relevant
- Keep it concise (2-4 sentences)
- Use a warm but professional tone

Original Email:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.date}

Email Content:
${email.body}

Write only the email body content, no subject line or additional formatting. Start with a greeting and end with a professional closing.`;

      return await this.callClaude(prompt);
    } catch (error) {
      console.error(`Claude API error for draft generation ${email.id}:`, error);
      
      // Fallback to pattern matching if Claude API fails
      const subject = email.subject.toLowerCase();
      const body = email.body.toLowerCase();
      
      if (subject.includes('timeline') || subject.includes('schedule')) {
        return `Hi ${email.from.name},\n\nThanks for checking in on the project timeline. I'll have the updated schedule to you by end of day tomorrow.\n\nBest regards`;
      } else if (subject.includes('reminder') && subject.includes('timesheet')) {
        return `Hi ${email.from.name},\n\nThank you for the reminder. I've submitted my timesheet for this period.\n\nBest regards`;
      } else if (subject.includes('feedback') || subject.includes('review')) {
        return `Hi ${email.from.name},\n\nThank you for sharing the feedback. I'll review the materials and get back to you with any questions or revisions by the end of the week.\n\nBest regards`;
      } else if (subject.includes('invoice') || subject.includes('payment')) {
        return `Hi ${email.from.name},\n\nI'll check on the payment status and get back to you with an update shortly.\n\nBest regards`;
      } else if (subject.includes('interview') || subject.includes('meeting')) {
        return `Hi ${email.from.name},\n\nThank you for the invitation. I'm available for the proposed time slots. Please send a calendar invite for your preferred time.\n\nBest regards`;
      } else if (body.includes('question') || body.includes('?')) {
        return `Hi ${email.from.name},\n\nThank you for your questions. I'll gather the information you requested and provide a detailed response by tomorrow.\n\nBest regards`;
      } else {
        return `Hi ${email.from.name},\n\nThank you for your email. I'll review this and get back to you soon.\n\nBest regards`;
      }
    }
  }

  async generateEmailDrafts(emails: Email[]): Promise<EmailDraft[]> {
    const drafts: EmailDraft[] = [];
    
    // Process all emails, not just ones needing responses
    // This maintains the correct order and mapping
    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      
      if (!email.requiresResponse) {
        // Add empty draft for emails that don't need responses
        drafts.push({
          emailId: email.id,
          draftContent: '',
          status: 'skipped'
        });
        continue;
      }
      
      this.onProgress?.(`Drafting reply ${drafts.filter(d => d.draftContent).length + 1}...`);
      
      try {
        const draftContent = await this.generateEmailDraft(email);
        drafts.push({
          emailId: email.id,
          draftContent,
          status: 'pending'
        });
      } catch (error) {
        console.error(`Failed to generate draft for email ${email.id}:`, error);
        drafts.push({
          emailId: email.id,
          draftContent: this.getFallbackDraft(email),
          status: 'pending'
        });
      }
    }
    
    return drafts;
  }

  // New method for processing individual emails with summary and optional draft
  async processEmail(email: Email): Promise<{ summary: string; draft?: EmailDraft }> {
    try {
      // Generate summary
      const summary = await this.summarizeEmail(email);
      
      // Generate draft if needed
      let draft: EmailDraft | undefined;
      if (email.requiresResponse) {
        const draftContent = await this.generateEmailDraft(email);
        draft = {
          emailId: email.id,
          draftContent,
          status: 'pending'
        };
      }
      
      return { summary, draft };
    } catch (error) {
      console.error(`Failed to process email ${email.id}:`, error);
      
      // Fallback processing
      const fallbackSummary = `${email.from.name} sent a message regarding "${email.subject}".`;
      let draft: EmailDraft | undefined;
      
      if (email.requiresResponse) {
        draft = {
          emailId: email.id,
          draftContent: this.getFallbackDraft(email),
          status: 'pending'
        };
      }
      
      return { summary: fallbackSummary, draft };
    }
  }

  private getFallbackDraft(email: Email): string {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    
    if (subject.includes('timeline') || subject.includes('schedule')) {
      return `Hi ${email.from.name},\n\nThanks for checking in on the project timeline. I'll have the updated schedule to you by end of day tomorrow.\n\nBest regards`;
    } else if (subject.includes('reminder') && subject.includes('timesheet')) {
      return `Hi ${email.from.name},\n\nThank you for the reminder. I've submitted my timesheet for this period.\n\nBest regards`;
    } else if (subject.includes('feedback') || subject.includes('review')) {
      return `Hi ${email.from.name},\n\nThank you for sharing the feedback. I'll review the materials and get back to you with any questions or revisions by the end of the week.\n\nBest regards`;
    } else if (subject.includes('invoice') || subject.includes('payment')) {
      return `Hi ${email.from.name},\n\nI'll check on the payment status and get back to you with an update shortly.\n\nBest regards`;
    } else if (subject.includes('interview') || subject.includes('meeting')) {
      return `Hi ${email.from.name},\n\nThank you for the invitation. I'm available for the proposed time slots. Please send a calendar invite for your preferred time.\n\nBest regards`;
    } else if (body.includes('question') || body.includes('?')) {
      return `Hi ${email.from.name},\n\nThank you for your questions. I'll gather the information you requested and provide a detailed response by tomorrow.\n\nBest regards`;
    } else {
      return `Hi ${email.from.name},\n\nThank you for your email. I'll review this and get back to you soon.\n\nBest regards`;
    }
  }



  async askForClarification(email: Email, question: string): Promise<string> {
    const prompt = `Given this email from ${email.from.name}:

${email.body}

The user needs clarification on: "${question}"

Draft a polite email asking for this specific clarification while acknowledging their original message.`;

    try {
      return await this.callClaude(prompt);
    } catch (error) {
      // Fallback response
      return `Hi ${email.from.name},\n\nThank you for your email. I need some additional information to provide a complete response: ${question}\n\nCould you please clarify this point?\n\nBest regards`;
    }
  }

  async improveEmailDraft(originalDraft: string, userFeedback: string, email: Email, onProgress?: (message: string) => void): Promise<string> {
    const prompt = `Please revise this email draft based on the user's feedback.

Original email context:
From: ${email.from.name}
Subject: ${email.subject}

Current draft:
${originalDraft}

User feedback:
${userFeedback}

Provide an improved draft that addresses the feedback while maintaining professionalism.`;

    try {
      onProgress?.('Analyzing user feedback...');
      const result = await this.callClaude(prompt, 0, (msg) => {
        // Map Claude SDK messages to our progress messages
        if (msg === 'Initializing Claude...') {
          onProgress?.('Revising email draft...');
        } else if (msg === 'Response complete') {
          onProgress?.('Draft updated successfully');
        }
      });
      return result;
    } catch (error) {
      onProgress?.('Failed to improve draft');
      // Fallback: try to incorporate feedback simply
      return originalDraft.replace('Best regards', `\n\n${userFeedback}\n\nBest regards`);
    }
  }

  /**
   * Refine email draft with session support (multi-turn conversations)
   * This is the new method for async refinement queue
   */
  async refineEmailDraftWithSession(
    emailId: string,
    currentDraft: string,
    feedback: string,
    email: Email,
    onProgress?: (message: string) => void
  ): Promise<string> {
    try {
      // Get or create session for this email
      const session = this.sessionManager.getOrCreateSession(emailId);

      // Increment turn count
      this.sessionManager.incrementTurn(emailId);

      // Build prompt
      const prompt = session.turnCount === 1
        ? this.buildInitialRefinementPrompt(email, currentDraft, feedback)
        : feedback; // Subsequent turns: just the feedback (session has context)

      // Query with session resume if available
      const options = session.sessionId
        ? { resume: session.sessionId, maxTurns: 1 }
        : { maxTurns: 1 };

      let result = '';

      onProgress?.('Refining draft...');

      for await (const message of this.agentClient.queryStream(prompt, options)) {
        // Update session
        this.sessionManager.updateSession(emailId, message);

        // Progress updates
        if (onProgress && message.type === 'system' && message.subtype === 'init') {
          onProgress('Analyzing request...');
        } else if (onProgress && message.type === 'assistant') {
          onProgress('Generating refined draft...');
        }

        // Extract result
        if (message.type === 'result' && message.subtype === 'success') {
          result = message.result;
          onProgress?.('Refinement complete');
        }
      }

      if (!result) {
        throw new Error('No result received from refinement');
      }

      return result.trim();

    } catch (error) {
      console.error(`Refinement failed for ${emailId}:`, error);
      throw error;
    }
  }

  /**
   * Build initial refinement prompt with full context
   */
  private buildInitialRefinementPrompt(email: Email, currentDraft: string, feedback: string): string {
    return `You are refining an email draft. Here's the context:

Original Email:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Date: ${email.date}

Email Content:
${email.body}

Current Draft:
${currentDraft}

User Feedback:
${feedback}

Please provide an improved version of the draft that addresses the user's feedback. You can use the search_inbox tool to look for similar emails or context if needed. Return only the improved draft text, no explanations.`;
  }

  // Streaming support for real-time updates
  async *streamBatchProcess(emails: Email[]): AsyncGenerator<{ type: string; data: any }> {
    yield { type: 'status', data: 'Initializing AI assistant...' };
    
    // Initialize if not already done
    if (!this.systemPrompt) {
      await this.initialize();
    }
    
    yield { type: 'status', data: 'Summarizing emails...' };
    const summaries = await this.summarizeEmailBatch(emails);
    yield { type: 'summaries', data: summaries };
    
    yield { type: 'status', data: 'Generating draft replies...' };
    const drafts = await this.generateEmailDrafts(emails);
    yield { type: 'drafts', data: drafts };
    
    yield { type: 'complete', data: { summaries, drafts } };
  }
}