# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Inbox is an AI-powered email triage assistant that runs in the terminal. It supports three modes:
- **Mock mode** (default) - Uses sample email data from SQLite database for demos/testing
- **Gmail mode** - Real Gmail integration via OAuth2 API
- **IMAP mode** - Universal email support for any IMAP provider (Gmail, Outlook, Yahoo, ProtonMail, etc.)

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
- `node dist/cli.js` - Run with mock email data (default)
- `node dist/cli.js --gmail` - Run with real Gmail account
- `node dist/cli.js --imap` - Run with IMAP account (any email provider)
- `node dist/cli.js --reset` - Reset mock emails to unread (for demo/testing)
- `node dist/cli.js --debug` - Enable debug mode with additional information

**Setup Commands:**
- `node dist/cli.js setup` - Configure Anthropic API key
- `node dist/cli.js setup-gmail` - Authenticate with Gmail via OAuth2
- `node dist/cli.js revoke-gmail` - Revoke Gmail authentication
- `node dist/cli.js setup-imap` - Configure IMAP account (interactive setup)
- `node dist/cli.js test` - Test API key configuration
- `node dist/cli.js status` - Show current configuration status

**IMAP Sync Commands:**
- `node dist/cli.js sync` - Sync last 7 days of emails from IMAP
- `node dist/cli.js sync --days 30` - Sync last 30 days
- `node dist/cli.js sync --full` - Full sync (last 30 days, all folders)
- `node dist/cli.js sync --unread` - Sync only unread emails

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

### IMAP Setup

**First Time IMAP Setup:**
1. Configure IMAP account interactively:
   ```bash
   npm run build
   node dist/cli.js setup-imap
   ```
   You'll be prompted for:
   - Email address
   - App-specific password (or regular password)
   - IMAP host (e.g., imap.gmail.com, outlook.office365.com)
   - IMAP port (default: 993)

2. Sync your emails to local database:
   ```bash
   node dist/cli.js sync --full
   ```

3. Run with IMAP:
   ```bash
   node dist/cli.js --imap
   ```

**IMAP Configuration Details:**
- Config stored in: `~/.claude-inbox/imap-config.json`
- Emails synced to: `~/.claude-inbox/emails.db` (SQLite)
- Supports all major providers: Gmail, Outlook, Yahoo, ProtonMail, FastMail, etc.
- For Gmail: Use app-specific password (create at https://myaccount.google.com/apppasswords)
- Connection test performed during setup to validate credentials

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

**Data Storage:**
- **EmailDatabase** - SQLite database with FTS5 full-text search, handles all email storage and querying
  - Location: `~/.claude-inbox/emails.db` (real emails) or `~/.claude-inbox/mock-emails.db` (mock data)
  - Features: Full-text search, advanced filtering, recipient tracking, attachment metadata
  - Database triggers for automatic FTS index updates
- **seed-mock-data** - Seeds SQLite database from `mock-data/inbox.json` for demo/testing

**Email Services:**
- **EmailService** - Unified email service supporting three modes (mock/gmail/imap)
  - Uses EmailDatabase as backend for all modes
  - Provides consistent API regardless of email source
- **ImapManager** - IMAP connection management with Gmail query syntax support
  - Singleton pattern with connection pooling
  - Parallel batch fetching for performance
  - X-GM-RAW support for native Gmail search operators
- **EmailSyncService** - Syncs emails from IMAP to SQLite database
  - Incremental sync with duplicate detection
  - Supports multiple folders and date ranges
- **GmailService** - Gmail API integration via OAuth2 (alternative to IMAP)
- **GmailAuthService** - OAuth2 authentication flow with token storage and auto-refresh

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

**Mock Mode:**
1. EmailService checks SQLite database at `~/.claude-inbox/mock-emails.db`
2. If empty, seeds 25 mock emails from `mock-data/inbox.json`
3. All email operations use SQLite with FTS5 search
4. Dashboard shows first 10 unread emails from database
5. Email read/unread state persists to SQLite

**IMAP Mode:**
1. EmailSyncService fetches emails from IMAP server
2. Syncs to SQLite database at `~/.claude-inbox/emails.db`
3. EmailService reads from SQLite (not IMAP directly)
4. Dashboard shows unread emails from database
5. Email operations update both SQLite and IMAP server

**Gmail Mode:**
1. Similar to IMAP but uses Gmail API instead
2. OAuth2 authentication with auto-refresh tokens
3. All data cached in SQLite for fast access

**Processing Flow:**
1. DraftReview processes emails individually:
   - AI generates summary for each email
   - AI generates draft if email needs response
   - User reviews each email one by one
   - Background processing prepares next email while user reviews
2. Components pass state up through callback props

## Technology Stack

- **Framework**: Node.js with TypeScript ES modules
- **Database**: SQLite with better-sqlite3 driver
  - FTS5 (Full-Text Search 5) virtual tables for fast email search
  - Separate databases for mock vs real emails
- **Email Protocols**:
  - IMAP via node-imap (universal email support)
  - Gmail API via googleapis (OAuth2)
  - mailparser for MIME message parsing
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
- **Mock Mode**: All 25 mock emails start as unread in SQLite database
- **IMAP/Gmail Mode**: Email state synced from server to SQLite
- Processed emails are marked as read in SQLite database
- Batch processing tracks offset to handle remaining emails
- `--reset` flag (mock mode only) clears database and reseeds all emails as unread

### Database File Locations
- **Mock emails**: `~/.claude-inbox/mock-emails.db` (SQLite)
- **Real emails**: `~/.claude-inbox/emails.db` (SQLite)
- **Gmail tokens**: `~/.claude-inbox/gmail-token.json`
- **IMAP config**: `~/.claude-inbox/imap-config.json`
- **Search logs**: `~/.claude-inbox/logs/email-search-*.json`

### File Structure Significance
- `src/types/email.ts` - Core interfaces shared across all components
- `src/services/email-database.ts` - SQLite database layer with FTS5 search
- `src/services/email-service.ts` - Unified service for mock/gmail/imap modes
- `src/services/imap-manager.ts` - IMAP connection and email fetching
- `src/services/imap-sync.ts` - IMAP to SQLite sync service
- `mock-data/inbox.json` - 25 realistic emails for seeding mock database
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

**mcp__inbox__search_inbox** - Email search with Gmail query syntax
- Supports full Gmail query syntax across all modes
- For IMAP mode with Gmail: Uses X-GM-RAW for native Gmail search
- For other IMAP providers: Translates to standard IMAP search criteria
- Mock mode: Searches SQLite database with FTS5
- Returns log file path for large result sets
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

All three modes (Mock, Gmail, IMAP) support Gmail's powerful query operators:

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

### Log File Pattern (All Modes)

Search results are written to timestamped JSON log files for large result sets:
- Location: `~/.claude-inbox/logs/email-search-*.json`
- Contains: Full email data including bodies
- Prevents context overflow with large result sets
- Works in all modes: Mock, Gmail, IMAP
- Claude can use Read/Grep tools to analyze logs

Example workflow:
```
1. search_inbox returns: { logFilePath: "logs/email-search-2025...json", ids: [...] }
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
- Future: Add Gmail send API integration and IMAP APPEND for sent items

**Mock Mode:**
- 25 pre-defined mock emails from `mock-data/inbox.json`
- SQLite database provides full Gmail query syntax support via FTS5

**Gmail Mode:**
- Requires OAuth2 setup with Google Cloud Console for custom client ID/secret
- Default test credentials provided but may have rate limits
- Emails cached in SQLite for performance

**IMAP Mode:**
- Requires app-specific password for providers like Gmail
- Must run `sync` command to fetch emails before use
- Email operations update SQLite; server updates not yet implemented
- Gmail query syntax support varies by provider:
  - Full support with Gmail (uses X-GM-RAW)
  - Limited translation for other IMAP providers
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.