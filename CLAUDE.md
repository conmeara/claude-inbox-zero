# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Inbox is an AI-powered email triage assistant that runs in the terminal. It supports both **mock email data** (for demos/testing) and **real Gmail integration** (for production use) via OAuth2.

## Email Writing Style Guidelines

When drafting email replies, please follow these preferences:

### Tone and Voice
- Use a warm, professional tone
- Be concise but not curt
- Show appreciation when appropriate ("Thank you for...")
- Use active voice when possible

### Structure
- Start with a personalized greeting using the sender's first name
- Get to the point quickly in the first sentence
- Use short paragraphs (2-3 sentences max)
- End with "Best regards" or "Best" depending on formality

### Response Patterns
- For scheduling: "I'm available [specific times]. Would [time] work for you?"
- For requests: Acknowledge receipt, provide timeline, confirm next steps
- For questions: Answer directly first, then provide context if needed
- For updates: Lead with the key status, then brief details

### Signature
```
Best regards,
[Your name]
```

### Example Responses

**For a meeting request:**
"Hi Alice, I'd be happy to discuss the project timeline. I'm available Tuesday 2-4pm or Thursday morning. Would either of these work for you?"

**For a task reminder:**
"Hi Bob, Thanks for the reminder. I've just submitted the timesheet. Please let me know if you need anything else."

**For feedback:**
"Hi Sarah, Thank you for the detailed feedback. I'll review your comments and incorporate the changes by Friday. I'll send you the updated version then."

## Development Commands

### Building and Running
- `npm run build` - Compile TypeScript to JavaScript (required before running)
- `npm run dev` - Run in development mode with auto-reload using tsx
- `npm run start` - Run the compiled application (uses mock data by default)
- `npm run typecheck` - Type check without compilation

### CLI Commands

**Main Usage:**
- `node dist/cli.js` - Run with mock email data
- `node dist/cli.js --gmail` - Run with real Gmail account
- `node dist/cli.js --reset` - Reset mock emails to unread (for demo/testing)
- `node dist/cli.js --debug` - Enable debug mode with additional information

**Setup Commands:**
- `node dist/cli.js setup` - Configure Anthropic API key
- `node dist/cli.js setup-gmail` - Authenticate with Gmail via OAuth2
- `node dist/cli.js revoke-gmail` - Revoke Gmail authentication
- `node dist/cli.js test` - Test API key configuration
- `node dist/cli.js status` - Show current configuration status

### Gmail Setup

**First Time Gmail Setup:**
1. Set environment variables (optional - uses default test credentials if not set):
   ```bash
   export GMAIL_CLIENT_ID="your-client-id"
   export GMAIL_CLIENT_SECRET="your-client-secret"
   ```

2. Authenticate with Gmail:
   ```bash
   npm run build
   node dist/cli.js setup-gmail
   ```
   This will open your browser for OAuth2 authentication.

3. Run with Gmail:
   ```bash
   node dist/cli.js --gmail
   ```

**Gmail Authentication Details:**
- OAuth credentials stored in: `~/.claude-inbox/gmail-token.json`
- Tokens are auto-refreshed when expired
- Required scopes: gmail.readonly, gmail.modify, gmail.compose, gmail.send

### Development Workflow
Always run `npm run build` after making TypeScript changes before testing with `npm run start`. Use `npm run dev` for active development with auto-reload.

## Architecture Overview

### Core Application Flow
The app follows a state machine pattern with these main states:
1. **loading** - Initialize mock inbox data  
2. **dashboard** - Display first 10 unread emails with Y/N prompt
3. **review** - Process emails individually with AI summaries and drafts (Tab/Edit/Skip workflow)
4. **confirm** - Final confirmation before "sending"
5. **complete** - Inbox zero achieved or batch completed

### Key Components Architecture
- **App.tsx** - Main state machine managing workflow between components
- **Dashboard.tsx** - Inbox overview, displays 10 emails with Y/N navigation
- **DraftReview.tsx** - Process emails individually showing summary + draft with Tab/Edit/Skip controls
- **SendConfirm.tsx** - Final review and mock sending simulation

### Service Layer

**Email Services:**
- **MockInboxService** - Manages mock email data from `mock-data/inbox.json`, handles read/unread state persistence
- **GmailService** - Real Gmail API integration via OAuth2, supports Gmail query syntax and log file pattern
- **GmailAuthService** - Handles OAuth2 authentication flow with token storage and auto-refresh

**AI Services:**
- **AIService** - Claude API integration with batch processing, personalized writing style, and intelligent fallbacks
- **AgentClient** - Wrapper around Claude Agent SDK with custom MCP tools and PreToolUse hooks
- **SessionManager** - Manages multi-turn conversations for email draft refinement
- **MemoryService** - Loads writing style preferences from CLAUDE.md

**Queue Services:**
- **EmailQueueManager** - Coordinates background email processing
- **InitialGenerationQueue** - Generates summaries and drafts in background
- **RefinementQueue** - Handles async draft refinement with multi-turn support

### Data Flow
1. MockInboxService loads 25 mock emails from JSON
2. Dashboard shows first 10 unread emails
3. DraftReview processes emails individually:
   - AI generates summary for each email
   - AI generates draft if email needs response
   - User reviews each email one by one
   - Background processing prepares next email while user reviews
4. Components pass state up through callback props
5. Email read/unread state persists to JSON file

## Technology Stack

- **Framework**: Node.js with TypeScript ES modules
- **UI**: Ink (React for CLI) with components for each workflow state
- **CLI**: Commander for argument parsing and help
- **Input**: Ink's useInput for keyboard interaction (Y/N, Tab, Edit, Skip)
- **State**: React hooks with service classes for business logic

## Important Implementation Details

### AI Integration
The AIService uses **optimized Claude Code SDK integration** with advanced features:

- **Individual Processing**: Each email processed separately with its own Claude SDK session
- **Parallel Processing**: While user reviews email N, Claude prepares email N+1
- **Personalized Style**: Automatically loads and applies writing preferences from this CLAUDE.md file
- **Smart Context**: Uses system prompts to better understand email context and generate appropriate responses
- **Multi-turn Support**: Allows AI improvements during draft editing ("AI: make this more formal")
- **Progress Updates**: Real-time status messages during AI processing
- **Fallback Logic**: Pattern-matching when API key is unavailable or API calls fail  
- **Retry Logic**: Exponential backoff with 3 retry attempts for reliable API calls
- **Error Handling**: Graceful degradation ensures the app always works

Set `ANTHROPIC_API_KEY` environment variable to enable real AI features.

### Interactive Controls
- Tab key accepts drafts (not just any key)
- useInput hooks capture specific key combinations for navigation
- Edit mode uses ink-text-input for multi-line editing
- State transitions are managed through callback props between components

### Email State Management
- All 25 mock emails start as unread
- Processed emails are marked as read in the JSON file
- Batch processing tracks offset to handle remaining emails
- --reset flag restores all emails to unread for demo purposes

### File Structure Significance
- `src/types/email.ts` - Core interfaces shared across all components
- `mock-data/inbox.json` - 25 realistic emails covering various scenarios
- ES module imports use .js extensions (not .ts) due to TypeScript ES module compilation

## Advanced Features

### Subagent Architecture

The app uses specialized subagents defined in `.claude/agents/` directory (based on Anthropic's best practices):

**email-searcher.md** - Email search specialist
- Finds relevant emails using strategic Gmail query syntax
- Analyzes results and provides actionable insights
- Works with log files for large result sets
- Tools: Read, Bash, Glob, Grep, mcp__inbox__search_inbox, mcp__inbox__read_emails

**draft-writer.md** - Email draft specialist
- Writes and refines professional email replies
- Adapts tone and style based on user feedback
- Searches inbox for context when needed
- Tools: Read, mcp__inbox__search_inbox, mcp__inbox__read_emails, mcp__inbox__read_email

### MCP Custom Tools

The AgentClient provides custom MCP tools for inbox operations:

**mcp__inbox__search_inbox** - Gmail query search
- Supports full Gmail query syntax
- For Gmail mode: Returns log file path with results
- For Mock mode: Returns results directly
- Example: `from:alice budget report newer_than:7d`

**mcp__inbox__read_email** - Read single email
- Fetches full email content by ID
- Returns complete email body (not just snippet)

**mcp__inbox__read_emails** - Batch read emails
- Fetches multiple emails by IDs in one call
- More efficient than reading individually

**mcp__inbox__list_unread** - List unread emails
- Returns unread emails with configurable limit

### Gmail Query Syntax

Both Mock and Gmail modes support Gmail's powerful query operators:

**Basic Operators:**
- `from:email` - Emails from specific sender
- `to:email` - Emails to specific recipient
- `subject:keyword` - Search in subject line
- `has:attachment` - Emails with attachments
- `is:unread` - Unread emails only
- `newer_than:7d` - From last 7 days
- `older_than:1m` - Older than 1 month

**Advanced Operators:**
- `OR` - Match either: `(invoice OR receipt)`
- `AND` - Match both (space implies AND): `invoice payment`
- `""` - Exact phrase: `"quarterly report"`
- `-` - Exclude: `invoice -draft`
- `()` - Group terms: `from:vendor.com (invoice OR receipt)`

### Log File Pattern (Gmail Mode)

When using Gmail, search results are written to timestamped JSON log files:
- Location: `~/.claude-inbox/logs/gmail-search-*.json`
- Contains: Full email data including bodies
- Prevents context overflow with large result sets
- Claude can use Read/Grep tools to analyze logs

Example workflow:
```
1. search_inbox returns: { logFilePath: "logs/gmail-search-2025...json", ids: [...] }
2. Agent uses Read tool to examine log file
3. Agent uses Grep to find specific patterns
4. Agent uses read_emails with IDs for detailed analysis
```

### PreToolUse Hooks

The AgentClient includes validation hooks to prevent unsafe operations:
- Blocks writes to system directories (/etc, /usr, /bin, etc.)
- Blocks modifications to config files (package.json, tsconfig.json)
- Only allows writes to: src/, mock-data/, .claude/, logs/
- Provides clear error messages when blocked

### Session Management

Multi-turn conversations for draft refinement:
- Each email draft has its own session
- Session IDs are captured and reused
- Context maintained across multiple refinements
- Supports complex feedback like "AI: make this more formal, then add urgency"

## Known Limitations

**Email Sending:**
- Currently simulation only (displays confirmation, doesn't actually send)
- Future: Add Gmail send API integration

**Mock Mode:**
- Gmail query syntax has limited support (basic search only)
- No log file pattern (results returned directly)
- 25 pre-defined mock emails

**Gmail Mode:**
- Requires OAuth2 setup with Google Cloud Console for custom client ID/secret
- Default test credentials provided but may have rate limits
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.