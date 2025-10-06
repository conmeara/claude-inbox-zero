# Claude Inbox Zero

AI-powered email triage assistant - Achieve inbox zero in your terminal.

## Overview

Claude Inbox Zero helps you achieve "Inbox Zero" by:
- 📊 **AI Summarization**: Generates concise summaries of email batches
- ✍️ **Smart Drafts**: Creates appropriate reply drafts for emails that need responses
- ⚡ **Interactive Review**: Tab to accept, edit drafts inline, or skip emails
- 📦 **Batch Processing**: Handle emails in manageable groups of 10
- 🎯 **Focused Workflow**: Process emails efficiently without switching contexts

## Quick Installation

### Install and Run (npx - Recommended)

```bash
npx https://github.com/[your-username]/claude-inbox-zero
```

This will:
1. Download and install the app
2. Run the first-time setup wizard
3. Start processing your emails

### Global Installation

```bash
npm install -g https://github.com/[your-username]/claude-inbox-zero
claude-inbox-zero
```

## First Run Setup

When you run Claude Inbox Zero for the first time, you'll see:

1. **Welcome Screen** - Beautiful ASCII art logo
2. **API Key Setup** - Choose to use Anthropic API key or demo mode
3. **Email Source** - Select Mock data (demo) or IMAP account

Your preferences are saved to `~/.claude-inbox/config.json` and you won't see the setup again unless you delete this file.

## Manual Installation (Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Run the application**:
   ```bash
   node dist/cli.js
   ```

## Usage

### Basic Commands

- `claude-inbox-zero` - Start the application
- `claude-inbox-zero --reset` - Reset all emails to unread (demo mode)
- `claude-inbox-zero --debug` - Enable debug information
- `claude-inbox-zero --help` - Show help

### Interactive Controls

#### Dashboard
- **Y** - Start processing the current batch
- **N** - Exit the application

#### Draft Review
- **Tab** - Accept the current draft as-is
- **E** - Edit the current draft
- **S** - Skip this email (leave unread)
- **B** - Go back to summary

#### Edit Mode
- **Type** - Edit the draft content
- **Enter** - Save your changes
- **Escape** - Cancel editing

#### Send Confirmation
- **Y** - Send all approved drafts and mark emails as read
- **N** - Go back to review drafts

## Workflow

1. **Dashboard**: View unread emails, shown in batches of 10
2. **Summarization**: AI generates summaries of each email's key points
3. **Draft Review**: Review AI-generated replies one by one
4. **Send Confirmation**: Final confirmation before sending
5. **Next Batch**: Continue with remaining emails until inbox zero! 🎉

## Email Modes

### Mock Mode (Demo)
- 25 realistic sample emails for testing
- Perfect for trying out the app without connecting real email
- All data stored in `~/.claude-inbox/mock-emails.db`

### IMAP Mode (Real Email)
- Connect to Gmail, Outlook, Yahoo, or any IMAP provider
- Requires app-specific password (for Gmail: https://myaccount.google.com/apppasswords)
- Syncs emails to local database for fast access
- Full Gmail query syntax support

## Configuration

### API Key Setup

**Option 1: Environment Variable**
```bash
export ANTHROPIC_API_KEY=your_api_key_here
claude-inbox-zero
```

**Option 2: First-Run Setup (Recommended)**
- The setup wizard will guide you through API key configuration
- Choose "Use Anthropic API Key" if you have one
- Choose "Demo mode" to try without an API key (uses pattern-matching)

### IMAP Setup

```bash
# Run sync command to configure IMAP
node dist/cli.js sync

# You'll be prompted for:
# - Email address
# - App-specific password
# - IMAP host (e.g., imap.gmail.com)
# - IMAP port (default: 993)
```

### Writing Style Customization

Create a `CLAUDE.md` file in your project root with your email preferences:

```markdown
## Email Writing Style

### Tone
- Use a warm, professional tone
- Be concise but friendly

### Signature
Best regards,
[Your name]
```

The AI will automatically match your style!

## Technical Architecture

```
src/
├── cli.ts                   # Entry point with Commander setup
├── app.tsx                  # Main application with state management
├── components/
│   ├── setup/              # First-run setup wizard
│   │   ├── WelcomeScreen.tsx
│   │   ├── ApiKeySetup.tsx
│   │   └── EmailModeSelection.tsx
│   ├── Dashboard.tsx       # Inbox overview
│   ├── DraftReview.tsx     # Interactive draft review
│   └── layouts/            # Reusable layouts
├── services/
│   ├── email-service.ts    # Unified email service (mock/gmail/imap)
│   ├── email-database.ts   # SQLite with FTS5 search
│   ├── ai.ts              # Claude API integration
│   └── imap-manager.ts    # IMAP connection management
└── utils/
    └── first-run-config.ts # Setup wizard management
```

## Features

### ✅ Implemented
- 🎨 Beautiful first-run setup wizard (Gemini CLI pattern)
- 🔄 Interactive terminal UI with Ink/React
- 🤖 Optimized Claude API integration with batch processing
- ✍️ Personalized writing style from CLAUDE.md
- 📧 Mock mode with 25 realistic sample emails
- 📬 IMAP support for real email (Gmail, Outlook, etc.)
- 🔍 Full Gmail query syntax in all modes
- 💾 SQLite database with FTS5 full-text search
- ⚡ Tab/Edit/Skip workflow
- 🔁 Multi-turn AI improvements
- 🎯 Batch processing with progress tracking
- 🔐 Secure credential storage

### 🚀 Performance
- 10 emails summarized in ~5 seconds (vs ~30 seconds individually)
- Background processing while you review
- Smart caching and retry logic

## Development

### Scripts
- `npm run build` - Compile TypeScript
- `npm run dev` - Development mode with auto-reload
- `npm run typecheck` - Type checking

### Publishing

1. Update version in `package.json`
2. Push to GitHub
3. Users can install via:
   ```bash
   npx https://github.com/[username]/claude-inbox-zero
   ```

## Troubleshooting

### Common Issues

**Setup not appearing?**
```bash
rm ~/.claude-inbox/config.json
claude-inbox-zero
```

**IMAP connection issues?**
- Verify app-specific password (not your regular password)
- Check IMAP settings for your provider
- Run: `node dist/cli.js sync --test`

**API key not working?**
- Verify key is set: `echo $ANTHROPIC_API_KEY`
- Re-run setup wizard

## Contributing

Contributions welcome! This project follows Gemini CLI's architecture patterns for consistency and best practices.

## License

ISC License
