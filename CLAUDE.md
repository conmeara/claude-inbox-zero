# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Inbox is an AI-powered email triage assistant that runs in the terminal. This is an MVP implementation that demonstrates the core concept using mock email data instead of real Gmail integration.

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
- `npm run start` - Run the compiled application 
- `npm run typecheck` - Type check without compilation
- `node dist/cli.js` - Direct execution of built CLI
- `node dist/cli.js --reset` - Reset mock emails to unread (for demo/testing)
- `node dist/cli.js --debug` - Enable debug mode with additional information

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
- **MockInboxService** - Manages email data from `mock-data/inbox.json`, handles read/unread state persistence
- **AIService** - Full Claude API integration with batch processing, personalized writing style, and intelligent fallbacks
- **MemoryService** - Stub for future CLAUDE.md user style preferences integration

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

## Known Limitations

This MVP intentionally uses mock implementations for:
- Email sending (simulation only)
- Gmail integration (mock JSON data)  
- OAuth authentication (not implemented)

The AIService now includes real Claude API integration with pattern-matching fallbacks for reliability.
# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.