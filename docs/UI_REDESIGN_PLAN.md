# Claude Inbox UI/UX Redesign Plan

**Date**: 2025-10-06
**Status**: Planning
**Reference**: Based on Google Gemini CLI best practices

---

## 🎯 Vision

Transform Claude Inbox into a modern, persistent chat-based CLI interface with vertical email cards, real-time AI progress indicators, and intelligent queue management. The app continuously processes unread emails in the background, always keeping a configurable number (default: 10) ready for instant review. When users request revisions, the next ready email appears immediately while the revision happens in the background with priority re-queuing.

---

## 🔑 Key Changes

### 1. **Login/Authentication Flow**

**Always Required**: Claude API Key (no fallback mode)

**Two-Step Auth Flow**:

**Step 1: API Key Setup**
```
┌─ Welcome to Claude Inbox ──────────────────────────┐
│                                                    │
│ Enter your Claude API key:                        │
│ sk-ant-... ________________________________        │
│                                                    │
│ Get your key at:                                  │
│ https://console.anthropic.com/settings/keys       │
│                                                    │
│ [Enter to continue]                               │
└────────────────────────────────────────────────────┘
```

**Step 2: Email Source Selection** (RadioButtonSelect from Gemini)
```
┌─ Email Source ─────────────────────────────────────┐
│                                                    │
│ Where should we fetch emails from?                │
│                                                    │
│ ○ Gmail (OAuth authentication required)           │
│ ○ Mock Data (demo/testing - 25 sample emails)     │
│                                                    │
│ (Use arrows to select, Enter to confirm)          │
└────────────────────────────────────────────────────┘
```

**Implementation**:
- Use Gemini's `RadioButtonSelect` component
- Show spinner during OAuth flow
- Store preferences in `~/.claude-inbox/config.json`
- Allow `--gmail` or `--mock` flags to skip dialog

---

### 2. **Vertical Email Card System**

**Card Structure** (Match Gemini's exact format with inline progress dots):

**Consistent Layout** - Same structure whether current or historical, only opacity changes:

```
┌─────────────────────────────────────────────────────┐
│ From: alice@example.com                             │
│ Subject: Budget Report Q4                           │
│ Date: Oct 5, 2025 2:30 PM                          │
│                                                     │
│ • Summary: Alice is requesting feedback on the Q4   │
│   budget report and needs your input by EOD Friday. │
│                                                     │
│ 🔧 Agent Tools Used:                                │
│   ✓ search_inbox("from:alice budget Q3") (1.2s)    │
│   ✓ read_email(msg_789) (0.5s)                     │
│   ✓ read_full_email_thread(msg_456) (0.8s)         │
│                                                     │
│ • Draft: Hi Alice, Thank you for sending the       │
│   budget report. I've reviewed it and have some... │
│                                                     │
│ ✓ Generated summary (2.3s)                         │
│ ✓ Generated draft reply (4.8s)                     │
│ ⏳ Waiting for your review...                       │
│                                                     │
│ [Tab: accept] [/edit] [Option+F: view full email]  │
└─────────────────────────────────────────────────────┘
```

**When Revising** (same layout, status changes):
```
┌─────────────────────────────────────────────────────┐
│ From: alice@example.com                             │
│ Subject: Budget Report Q4                           │
│ Date: Oct 5, 2025 2:30 PM                          │
│                                                     │
│ • Summary: Alice is requesting feedback on the Q4   │
│   budget report and needs your input by EOD Friday. │
│                                                     │
│ 🔧 Agent Tools Used:                                │
│   ✓ search_inbox("from:alice budget Q3") (1.2s)    │
│   ✓ read_email(msg_789) (0.5s)                     │
│   ✓ read_full_email_thread(msg_456) (0.8s)         │
│                                                     │
│ • Draft: Hi Alice, Thank you for sending the       │
│   budget report. I've reviewed it and have some... │
│                                                     │
│ ✓ Generated summary (2.3s)                         │
│ ✓ Generated draft reply (4.8s)                     │
│ ⏳ Revising draft... (3s)                            │
│                                                     │
│ User request: "AI: make this more formal"          │
└─────────────────────────────────────────────────────┘
```

**Card States & Opacity**:
- **Current Card**: 100% opacity (bright, active border)
- **Historical Cards**: 60% opacity (dimmed, default border)
- **Layout**: Identical regardless of state - only opacity and border color change

**Status Indicators** (visible when scrolling up):
- ✓ **Sent** - Draft accepted and sent
- ⏳ **Revising** - User requested changes, AI is working
- 🔍 **Searching** - Agent searching inbox/context
- ⊘ **Skipped** - User skipped, marked unread
- ⚠️ **Error** - Something failed
- 📝 **Processing** - Initial summary/draft generation

**Tool Call Display**:
- Show all MCP tools the agent used
- Display with icon (🔧), tool name, args, and duration
- Helps users understand context gathering
- Collapses in historical cards (show count only)

**Full Email Viewing**:
- Press `Option+F` to expand full email body within card
- Shows complete email with markdown rendering
- Press `Option+F` again to collapse back to summary

---

### 3. **Persistent Chat Interface with Status Bar**

**Layout**:
```
[Scrollable area - Email cards stack vertically]
  ↑
  │ (Card 3 - ✓ Sent) [dimmed 60%]
  │ (Card 2 - ✓ Sent) [dimmed 60%]
  │ (Card 1 - Ready for review) [bright 100%] ← Current
  ↓

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Draft sent successfully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                            23 unread | 10 ready
> Crafting response... _
```

**Input Box**:
- Accepts slash commands: `/quit`, `/edit`, `/skip`, `/next`, `/settings`, `/help`
- Accepts AI refinement: `AI: make this more formal`
- Shows rotating loading phrases during AI operations
- No manual text commands - use keyboard shortcuts or slash commands

**Slash Commands** (from Gemini pattern):
- `/quit` - Exit application
- `/edit` - Open draft in text editor
- `/skip` - Skip current email (keep as unread)
- `/next` - Accept draft and move to next
- `/settings` - Open settings dialog
- `/help` - Show keyboard shortcuts and commands

**Keyboard Shortcuts**:
- **Tab** - Accept draft and move to next
- **ESC** - Cancel current AI operation
- **Option+F** - Toggle full email view
- **Cmd+Up** - Navigate to previous email card
- **Cmd+Down** - Navigate to next email card
- **Regular Up/Down** - Navigate text input history (if implemented)

**Notifications** (temporary toast messages):
- "✓ Draft sent successfully"
- "⚠️ Failed to send draft"
- "✓ Settings saved"
- Auto-dismiss after 3 seconds

**Loading Phrases** (rotates during AI operations):
- "Reading your emails..."
- "Crafting response..."
- "Searching for context..."
- "Thinking..."
- "Analyzing email thread..."

---

### 4. **Dynamic Queue Management**

**Core Behavior**: App always keeps **N emails ready** (default: 10, user-configurable)

**Queue Intelligence**:
1. On startup: Fetch all unread email IDs
2. Background: Generate summaries + drafts for first N emails
3. As user reviews: Continuously prepare more emails
4. When user accepts/skips: Next ready email appears **instantly**

**Priority Re-queuing** (Key Feature):
```
User is reviewing Email #5
  ↓
User types: "AI: make this shorter"
  ↓
Email #6 appears IMMEDIATELY (already ready)
  ↓
Email #5 goes to background for revision
  ↓
When revision completes: Email #5 jumps to FRONT of queue
  ↓
User sees Email #5 again (fresh in their mind)
```

**Status Bar** (Bottom Right):
```
23 unread | 10 ready
```
- **Unread** - Total unread emails remaining
- **Ready** - How many emails have summaries + drafts ready for instant review

**Settings Dialog** (via `/settings` command):
```
┌─ Settings ──────────────────────────────────────────┐
│                                                     │
│ Queue Size (emails ready for review)               │
│ ○ 5 emails                                         │
│ ● 10 emails (default)                              │
│ ○ 15 emails                                        │
│ ○ 20 emails                                        │
│                                                     │
│ Email Source                                       │
│ ● Gmail                                            │
│ ○ Mock Data                                        │
│                                                     │
│ [ESC to close] [Enter to save]                     │
└─────────────────────────────────────────────────────┘
```

---

### 5. **Streaming & AI Progress**

**StreamingContext** (from Gemini):
- Track AI state: `Idle`, `Responding`, `WaitingForConfirmation`
- Show spinner during AI operations
- Display elapsed time with rotating phrases
- Show current operation in input area

**Progress Indicators** (Gemini-style inline dots):
```
✓ Generated summary (2.3s)
✓ Generated draft reply (3.1s)
⏳ Waiting for your review...
```

**For Revisions**:
```
✓ Generated summary (2.3s)
✓ Generated draft reply (3.1s)
⏳ Revising draft... (5s)
```

**For Agent Tools**:
```
✓ Generated summary (2.3s)
🔧 Agent Tools Used:
  ✓ search_inbox("from:alice budget Q3") (1.2s)
  ✓ read_email(msg_789) (0.5s)
✓ Generated draft reply (3.8s)
⏳ Waiting for your review...
```

**Scroll-Up View** (Historical Cards):
When user scrolls up, they see progress of cards being revised (same layout, 60% opacity):
```
┌─────────────────────────────────────────────────────┐
│ From: alice@example.com                             │
│ Subject: Budget Report Q4                           │
│                                                     │
│ • Summary: Alice is requesting feedback...          │
│                                                     │
│ ⏳ Revising draft... (8s)                            │
│                                                     │
│ User request: "AI: make this more formal"          │
└─────────────────────────────────────────────────────┘
```

---

### 6. **Help System**

**Via `/help` command**:
```
┌─ Keyboard Shortcuts ────────────────────────────────┐
│                                                     │
│ Tab             Accept draft and continue          │
│ Cmd+Up/Down     Navigate between email cards       │
│ Option+F        View full email                    │
│ ESC             Cancel current operation           │
│                                                     │
│ Slash Commands:                                    │
│ /edit           Open draft in editor               │
│ /skip           Skip email (keep unread)           │
│ /next           Accept and continue                │
│ /settings       Open settings                      │
│ /help           Show this help                     │
│ /quit           Exit application                   │
│                                                     │
│ AI Refinement:                                     │
│ AI: [prompt]    Refine current draft               │
│   Examples:                                        │
│   - AI: make this more formal                      │
│   - AI: add more details about timeline            │
│   - AI: make this shorter                          │
│                                                     │
│ [ESC to close]                                     │
└─────────────────────────────────────────────────────┘
```

---

### 7. **Markdown Rendering**

**Email Display**:
- HTML emails rendered as clean markdown
- Support for **bold**, *italic*, `code`, links
- Bullet lists and numbered lists
- Code blocks with syntax highlighting (if possible)

**Draft Display**:
- Render formatted text nicely
- Preserve line breaks and paragraphs
- Show markdown in full email view

**Implementation**:
- Use Gemini's `MarkdownDisplay.tsx` and `InlineMarkdownRenderer.tsx`
- Fallback to plain text if rendering fails

---

### 8. **Responsive Layouts**

**Terminal Width Handling**:
- Detect terminal width changes
- Adapt card width dynamically
- Truncate long lines with `wrap="truncate-end"`
- Stack elements vertically on narrow terminals (<80 cols)

**Examples**:
- Wide terminal: Status bar on same line as separator
- Narrow terminal: Status bar on separate line
- Email metadata wraps gracefully

---

### 9. **Session Persistence**

**On Quit**:
- Save current position in queue
- Mark accepted emails as **read**
- Keep skipped emails as **unread**
- Save any in-progress revisions

**On Restart**:
- Resume from saved position
- Continue processing unread emails
- Re-fetch unread count (may have new emails)
- Restart queue preparation from current position

**Storage** (`~/.claude-inbox/session.json`):
```json
{
  "lastProcessedEmailId": "msg_123",
  "acceptedEmailIds": ["msg_100", "msg_101"],
  "skippedEmailIds": ["msg_102"],
  "pendingRevisions": [
    {
      "emailId": "msg_103",
      "request": "AI: make this shorter"
    }
  ],
  "queueSize": 10
}
```

---

## 🏗️ Architecture Changes

### New Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── AuthDialog.tsx           ← New: Coordinator
│   │   ├── ApiKeySetup.tsx          ← New: API key input
│   │   └── EmailSourceSelect.tsx    ← New: Gmail/Mock selection
│   ├── email/
│   │   ├── EmailCard.tsx            ← New: Main card component
│   │   ├── EmailSummary.tsx         ← New: Bullet-point summary
│   │   ├── EmailDraft.tsx           ← New: Draft display with markdown
│   │   ├── EmailProgress.tsx        ← New: Inline progress dots
│   │   ├── EmailToolCalls.tsx       ← New: Agent tool display
│   │   └── EmailFullView.tsx        ← New: Expanded email view
│   ├── chat/
│   │   ├── ChatComposer.tsx         ← New: Input box with slash commands
│   │   ├── StatusBar.tsx            ← New: Unread/ready counts
│   │   └── Notification.tsx         ← New: Toast messages
│   ├── dialogs/
│   │   ├── SettingsDialog.tsx       ← New: Settings with RadioButtonSelect
│   │   └── HelpDialog.tsx           ← New: Keyboard shortcuts help
│   ├── shared/
│   │   ├── LoadingIndicator.tsx     ← From Gemini: Spinner + timer
│   │   ├── RadioButtonSelect.tsx    ← From Gemini: Selection UI
│   │   ├── Spinner.tsx              ← From Gemini: ink-spinner wrapper
│   │   ├── MarkdownDisplay.tsx      ← From Gemini: Markdown rendering
│   │   └── InlineMarkdownRenderer.tsx ← From Gemini: Inline markdown
│   ├── App.tsx                       ← Refactored: Static + cards layout
│   └── Dashboard.tsx                 ← Remove: No longer needed
├── contexts/
│   ├── StreamingContext.tsx         ← New: AI streaming state
│   ├── QueueContext.tsx             ← New: Email queue state
│   └── NotificationContext.tsx      ← New: Toast notifications
├── hooks/
│   ├── useAuth.ts                   ← New: Auth flow management
│   ├── useSlashCommands.ts          ← New: Parse and execute slash commands
│   ├── useEmailQueue.ts             ← Modified: Dynamic queue with priority
│   ├── useLoadingPhrases.ts         ← New: Rotating loading messages
│   └── useResponsiveLayout.ts       ← New: Detect terminal width changes
└── services/
    ├── QueueManager.ts              ← Modified: Keep N ready, priority re-queue
    └── SessionManager.ts            ← New: Save/restore session state
```

### State Management

**StreamingContext** (Global):
```typescript
enum StreamingState {
  Idle = 'idle',
  Responding = 'responding',
  WaitingForConfirmation = 'waiting_for_confirmation'
}

interface StreamingContextValue {
  state: StreamingState;
  currentOperation: string | null;
  elapsedTime: number;
  loadingPhrase: string; // Rotating phrase
}
```

**QueueContext** (Global):
```typescript
interface QueueContextValue {
  totalUnread: number;
  readyForReview: number;
  queueSize: number; // User-configurable, default 10
  currentEmailIndex: number;
  emailCards: EmailCard[];
  navigateToCard: (index: number) => void;
}
```

**NotificationContext** (Global):
```typescript
interface NotificationContextValue {
  notifications: Notification[];
  showNotification: (message: string, type: 'success' | 'error' | 'info') => void;
  dismissNotification: (id: string) => void;
}

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: Date;
}
```

**EmailCard State** (Per-Email):
```typescript
interface EmailCard {
  email: Email;
  summary: string | null;
  draft: string | null;
  status: 'processing' | 'ready' | 'sent' | 'skipped' | 'revising' | 'searching' | 'error';
  progress: ProgressStep[];
  toolCalls: ToolCall[];
  error?: string;
  showFullEmail: boolean;
  revisionRequest?: string; // "AI: make this shorter"
  isPriority: boolean; // True if this is a revision (jumps queue)
}

interface ProgressStep {
  icon: string; // '✓' | '⏳' | '🔍' | '⚠️'
  message: string;
  duration?: number;
  timestamp: Date;
}

interface ToolCall {
  name: string;
  args: string;
  duration: number;
  status: 'success' | 'error';
}
```

---

## 📐 Visual Design

### Theme & Colors

**Adopt Gemini's semantic-colors pattern**:
```typescript
export const theme = {
  text: {
    primary: '#E0E0E0',
    secondary: '#A0A0A0',
    accent: '#4FC3F7',
    error: '#FF6B6B',
    success: '#51CF66',
    warning: '#FFD93D',
  },
  border: {
    default: '#505050',
    active: '#4FC3F7',
    error: '#FF6B6B',
  },
  card: {
    current: 1.0,    // 100% opacity
    historical: 0.6, // 60% opacity
  },
  notification: {
    success: '#51CF66',
    error: '#FF6B6B',
    info: '#4FC3F7',
  },
};
```

### Border Styles

**Email Cards**:
- Border: `round` style
- Color: `theme.border.active` (current), `theme.border.default` (historical)
- Padding: 1 (internal spacing)
- Opacity: Dynamic based on current vs historical
- **Layout stays identical** - only opacity and border color change

**Modals/Dialogs**:
- Border: `round` style
- Color: `theme.border.default`
- Centered on screen
- Full padding for readability

### Spacing

- Card margin-bottom: 1
- Section spacing within card: 1
- Status bar: Horizontal line separator
- Progress dots: No extra margin (inline with text)
- Notification: Above status bar, 1 line padding

---

## 🚀 Migration Plan

### Phase 1: Foundation (Week 1)
**Goal**: Add streaming context, theme, and basic components

**Tasks**:
1. Install dependencies:
   ```bash
   npm install ink-spinner cli-spinners marked
   ```

2. Create structure:
   ```bash
   mkdir -p src/components/{auth,email,chat,dialogs,shared}
   mkdir -p src/contexts
   ```

3. Implement core:
   - `StreamingContext.tsx` - Global AI state
   - `theme.ts` - Semantic colors (from Gemini)
   - `LoadingIndicator.tsx` - Spinner + timer
   - `Spinner.tsx` - Wrapper for ink-spinner
   - `useLoadingPhrases.ts` - Rotating phrases

4. Integration:
   - Wrap App with `StreamingContext.Provider`
   - Test streaming state updates
   - Test loading phrase rotation

**Validation**: Can toggle streaming state, see spinner with rotating phrases

---

### Phase 2: Email Cards (Week 2)
**Goal**: Build EmailCard component with Gemini-style progress and tool display

**Tasks**:
1. Copy from Gemini:
   - `MarkdownDisplay.tsx` - Markdown rendering
   - `InlineMarkdownRenderer.tsx` - Inline markdown

2. Create card components:
   - `EmailCard.tsx` - Main card with opacity support
   - `EmailSummary.tsx` - Bullet-point summary with markdown
   - `EmailDraft.tsx` - Draft display with markdown
   - `EmailProgress.tsx` - Inline progress dots (✓, ⏳, 🔍)
   - `EmailToolCalls.tsx` - Agent tool display

3. State management:
   - Add `EmailCard` interface to types
   - Add `ProgressStep` and `ToolCall` tracking
   - Support status transitions
   - Track opacity state

4. Test single card:
   - Replace DraftReview with EmailCard
   - Verify progress dots appear inline
   - Check tool calls display properly
   - Verify markdown rendering
   - Test opacity changes

**Validation**: Single email displays as card with Gemini-style progress and tool calls

---

### Phase 3: Static Layout + Navigation (Week 3)
**Goal**: Stack cards vertically with Cmd+Arrow navigation

**Tasks**:
1. Refactor App.tsx:
   - Use Ink's `<Static>` for historical cards
   - Current card below Static area
   - StatusBar and Notification at bottom

2. Add navigation:
   - `Cmd+Up/Down` to navigate cards
   - Update current card index
   - Change opacity dynamically (100% current, 60% historical)
   - Scroll position management

3. Create ChatComposer:
   - Input field at bottom
   - Slash command parsing
   - Status bar integration
   - Loading phrase display

4. Add NotificationContext:
   - Toast message system
   - Auto-dismiss after 3 seconds
   - Success/Error/Info types

5. Remove old components:
   - Delete Dashboard.tsx
   - Delete SendConfirm.tsx
   - Delete DraftReview.tsx

**Validation**: Cards stack, can navigate with keyboard, notifications work

---

### Phase 4: Slash Commands + Help (Week 4)
**Goal**: Implement Gemini-style slash command system and help dialog

**Tasks**:
1. Create slash command parser:
   - `/quit` - Exit app
   - `/edit` - Open editor
   - `/skip` - Skip email
   - `/next` - Accept and continue
   - `/settings` - Open settings
   - `/help` - Show help dialog

2. Add command executor:
   - Hook into existing actions
   - Show feedback via notifications
   - Handle errors gracefully

3. Create HelpDialog:
   - Show keyboard shortcuts
   - Show slash commands
   - Show AI refinement examples
   - ESC to close

4. Copy from Gemini:
   - Command registration system
   - Help text formatting

**Validation**: Slash commands execute correctly, help dialog displays

---

### Phase 5: Settings Dialog (Week 5)
**Goal**: Add settings dialog with queue size configuration

**Tasks**:
1. Copy from Gemini:
   - `RadioButtonSelect.tsx` + dependencies
   - `BaseSelectionList.tsx`

2. Create SettingsDialog:
   - Queue size selection (5, 10, 15, 20)
   - Email source selection (Gmail, Mock)
   - Save to config file
   - ESC to close, Enter to save

3. Integration:
   - Open via `/settings` command
   - Update queue manager when size changes
   - Show notification on save

**Validation**: Settings dialog works, queue size changes take effect

---

### Phase 6: Auth Flow (Week 6)
**Goal**: Interactive authentication with RadioButtonSelect

**Tasks**:
1. Create auth components:
   - `AuthDialog.tsx` - Coordinator
   - `ApiKeySetup.tsx` - API key input
   - `EmailSourceSelect.tsx` - Gmail/Mock selection (reuse from settings)

2. Auth hook:
   - `useAuth.ts` - State machine
   - Validate API key
   - Handle OAuth for Gmail

3. CLI integration:
   - Show on first run
   - Allow `--gmail`, `--mock` flags
   - Store in `~/.claude-inbox/config.json`

**Validation**: Auth flow works, config persists

---

### Phase 7: Dynamic Queue + Priority (Week 7)
**Goal**: Remove batches, implement smart queue with priority re-queuing

**Tasks**:
1. Modify EmailQueueManager:
   - Remove batch concept
   - Fetch all unread IDs on start
   - Keep N emails "ready" (from settings)
   - Auto-prepare next when user acts

2. Priority re-queuing:
   - When revision requested: mark card as `isPriority: true`
   - Move revised card to front of queue
   - Show next ready card immediately
   - Update notification: "Revising draft in background..."

3. Status bar:
   - Real-time unread count
   - Real-time ready count
   - Position: bottom right

**Validation**: Queue auto-fills, revisions jump queue, status bar updates

---

### Phase 8: Session Persistence (Week 8)
**Goal**: Save/restore session state across restarts

**Tasks**:
1. Create SessionManager:
   - Save position on quit
   - Save accepted/skipped email IDs
   - Save pending revisions
   - Save queue size preference

2. Integration:
   - Load session on startup
   - Resume from last position
   - Mark accepted emails as read
   - Keep skipped as unread
   - Show notification: "Resuming from last session..."

3. Edge cases:
   - New emails arrived since last run
   - Deleted emails
   - Gmail sync issues

**Validation**: Can quit and resume seamlessly

---

### Phase 9: Full Email View (Week 9)
**Goal**: Add Option+F to view complete email with markdown

**Tasks**:
1. Create EmailFullView:
   - Show complete body with markdown rendering
   - Handle HTML to markdown conversion
   - Show thread if available
   - Graceful fallback to plain text

2. Keyboard binding:
   - `Option+F` to toggle
   - Update card state
   - Scroll handling within card

3. Agent tool integration:
   - Add MCP tool: `read_full_email_thread`
   - Agent can fetch thread when summarizing
   - Tool available during refinement
   - Display in tool calls section

**Validation**: Can view full email, agent can fetch thread, markdown renders properly

---

### Phase 10: Responsive Layouts (Week 10)
**Goal**: Adapt to different terminal widths

**Tasks**:
1. Create useResponsiveLayout hook:
   - Detect terminal width changes
   - Return layout breakpoints
   - Handle resize events

2. Update components:
   - EmailCard: Truncate long lines
   - StatusBar: Stack on narrow terminals
   - ChatComposer: Adapt width
   - Dialogs: Center and scale

3. Test edge cases:
   - Very narrow (40 cols)
   - Standard (80 cols)
   - Wide (120+ cols)

**Validation**: App adapts to terminal width changes gracefully

---

### Phase 11: Polish & Testing (Week 11)
**Goal**: Refinement, error handling, testing

**Tasks**:
1. Visual polish:
   - Consistent spacing across all cards
   - Smooth opacity transitions
   - Color refinement
   - Loading phrase variety

2. Error handling:
   - API failures (use Claude SDK's built-in handling)
   - Network issues
   - Invalid credentials
   - Empty inbox
   - Markdown rendering failures

3. Edge cases:
   - Very long emails
   - Empty subjects
   - Special characters
   - Threading edge cases
   - Rapid navigation

4. Testing:
   - All slash commands
   - All keyboard shortcuts
   - Navigation flows
   - Priority re-queuing
   - Session persistence
   - Notifications
   - Settings changes
   - Responsive layouts

**Validation**: App feels polished, handles errors gracefully, no major bugs

---

## 🎨 Detailed Component Specs

### EmailCard.tsx

**Props**:
```typescript
interface EmailCardProps {
  card: EmailCard;
  isCurrent: boolean;
  onAccept: () => void;
  onSkip: () => void;
  onEdit: () => void;
  onToggleFullEmail: () => void;
}
```

**Layout** (Gemini style - consistent regardless of state):
```tsx
<Box
  borderStyle="round"
  borderColor={isCurrent ? theme.border.active : theme.border.default}
  padding={1}
  opacity={isCurrent ? theme.card.current : theme.card.historical}
>
  <EmailHeader email={card.email} />

  {card.showFullEmail ? (
    <EmailFullView email={card.email} />
  ) : (
    <>
      {card.summary && (
        <Box marginTop={1}>
          <Text>• <Text bold>Summary:</Text> </Text>
          <MarkdownDisplay content={card.summary} />
        </Box>
      )}

      {card.toolCalls.length > 0 && (
        <EmailToolCalls toolCalls={card.toolCalls} />
      )}

      {card.draft && (
        <Box marginTop={1}>
          <Text>• <Text bold>Draft:</Text> </Text>
          <MarkdownDisplay content={card.draft} />
        </Box>
      )}
    </>
  )}

  <EmailProgress steps={card.progress} />

  {card.revisionRequest && (
    <Box marginTop={1}>
      <Text color={theme.text.secondary}>
        User request: "{card.revisionRequest}"
      </Text>
    </Box>
  )}

  {isCurrent && <EmailActions />}
</Box>
```

---

### ChatComposer.tsx

**Props**:
```typescript
interface ChatComposerProps {
  onSlashCommand: (command: string, args: string[]) => void;
  onAIRefinement: (prompt: string) => void;
  isDisabled: boolean;
  loadingPhrase?: string;
}
```

**Features**:
- Parse slash commands: `/quit`, `/edit`, etc.
- Detect `AI:` prefix for refinements
- Show status bar above input
- Show notification above status bar
- Display loading phrase in input area

**Layout**:
```tsx
<Box flexDirection="column">
  {/* Separator */}
  <Box borderColor="gray" borderStyle="single">
    <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━</Text>
  </Box>

  {/* Notification (if any) */}
  <Notification />

  {/* Separator */}
  <Box borderColor="gray" borderStyle="single">
    <Text dimColor>━━━━━━━━━━━━━━━━━━━━━━</Text>
  </Box>

  {/* Status Bar */}
  <StatusBar unread={23} ready={10} />

  {/* Input */}
  <Box>
    <Text>{">"} </Text>
    {isDisabled ? (
      <Text color={theme.text.secondary}>{loadingPhrase}</Text>
    ) : (
      <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
    )}
  </Box>
</Box>
```

---

### EmailToolCalls.tsx

**Props**:
```typescript
interface EmailToolCallsProps {
  toolCalls: ToolCall[];
  collapsed?: boolean; // For historical cards
}
```

**Display**:
```tsx
<Box marginTop={1} flexDirection="column">
  <Text>🔧 <Text bold>Agent Tools Used:</Text></Text>
  {collapsed ? (
    <Text color={theme.text.secondary}>
      {toolCalls.length} tool{toolCalls.length !== 1 ? 's' : ''} used
    </Text>
  ) : (
    toolCalls.map((tool, i) => (
      <Box key={i} paddingLeft={2}>
        <Text color={theme.text.success}>✓</Text>
        <Text> {tool.name}({tool.args}) </Text>
        <Text color={theme.text.secondary}>({tool.duration}s)</Text>
      </Box>
    ))
  )}
</Box>
```

---

### StatusBar.tsx

**Props**:
```typescript
interface StatusBarProps {
  unread: number;
  ready: number;
}
```

**Display** (Right-aligned, responsive):
```tsx
<Box justifyContent="flex-end">
  <Text color={theme.text.secondary}>
    {unread} unread | {ready} ready
  </Text>
</Box>
```

---

### Notification.tsx

**Props**:
```typescript
interface NotificationProps {
  notification: Notification | null;
}
```

**Display**:
```tsx
{notification && (
  <Box>
    <Text color={theme.notification[notification.type]}>
      {notification.type === 'success' && '✓ '}
      {notification.type === 'error' && '⚠️ '}
      {notification.type === 'info' && 'ℹ️ '}
      {notification.message}
    </Text>
  </Box>
)}
```

---

### HelpDialog.tsx

**Layout**:
```tsx
<Box
  borderStyle="round"
  borderColor={theme.border.default}
  padding={1}
  flexDirection="column"
>
  <Text bold color={theme.text.primary}>Keyboard Shortcuts</Text>

  <Box marginTop={1} flexDirection="column">
    <ShortcutRow shortcut="Tab" description="Accept draft and continue" />
    <ShortcutRow shortcut="Cmd+Up/Down" description="Navigate between email cards" />
    <ShortcutRow shortcut="Option+F" description="View full email" />
    <ShortcutRow shortcut="ESC" description="Cancel current operation" />
  </Box>

  <Box marginTop={1}>
    <Text bold color={theme.text.primary}>Slash Commands:</Text>
  </Box>

  <Box marginTop={1} flexDirection="column">
    <CommandRow command="/edit" description="Open draft in editor" />
    <CommandRow command="/skip" description="Skip email (keep unread)" />
    <CommandRow command="/next" description="Accept and continue" />
    <CommandRow command="/settings" description="Open settings" />
    <CommandRow command="/help" description="Show this help" />
    <CommandRow command="/quit" description="Exit application" />
  </Box>

  <Box marginTop={1}>
    <Text bold color={theme.text.primary}>AI Refinement:</Text>
  </Box>

  <Box marginTop={1} flexDirection="column">
    <Text color={theme.text.secondary}>AI: [prompt] - Refine current draft</Text>
    <Text color={theme.text.secondary}>  Examples:</Text>
    <Text color={theme.text.secondary}>  - AI: make this more formal</Text>
    <Text color={theme.text.secondary}>  - AI: add more details about timeline</Text>
    <Text color={theme.text.secondary}>  - AI: make this shorter</Text>
  </Box>

  <Box marginTop={1}>
    <Text color={theme.text.secondary}>[ESC to close]</Text>
  </Box>
</Box>
```

---

## 📊 Success Criteria

**Must Have**:
- ✅ API key required on first run
- ✅ RadioButtonSelect for Gmail/Mock selection
- ✅ Vertical email cards with Gemini-style inline progress dots
- ✅ Card layout **stays consistent** - only opacity changes (100% current, 60% historical)
- ✅ Tool call display showing agent context gathering
- ✅ Markdown rendering for emails and drafts
- ✅ Cmd+Up/Down navigation between cards
- ✅ Status bar showing unread + ready counts (bottom right)
- ✅ Notification system for feedback
- ✅ Rotating loading phrases
- ✅ Slash commands: `/quit`, `/edit`, `/skip`, `/next`, `/settings`, `/help`
- ✅ Help dialog with shortcuts and examples
- ✅ Settings dialog with queue size configuration
- ✅ AI refinement with priority re-queuing
- ✅ Dynamic queue management (configurable size, default 10)
- ✅ Session persistence (resume on restart)
- ✅ Option+F to view full email
- ✅ Responsive layouts for different terminal widths
- ✅ Cards show status when scrolling up (sent/revising/searching)

**Nice to Have** (Future Iterations):
- ⭐ Slash command auto-complete
- ⭐ Vim keybindings option
- ⭐ Custom themes
- ⭐ Attachment support
- ⭐ Email threading display

**Performance**:
- Cards render smoothly
- Queue prefetching doesn't block UI
- No memory leaks
- Handles 100+ unread emails gracefully
- Markdown rendering is fast

---

## 🚧 Answered Questions

1. **Card Display**: Keep fully expanded, consistent layout always
2. **Error Handling**: Let Claude Agent SDK handle it, show in notifications
3. **Quit Behavior**: Save position, resume on restart. Mark accepted as read, skipped stays unread.
4. **Email Threading**: Agent summarizes as-is. Has tool to fetch full thread if needed.
5. **Attachments**: Ignore for now (will add file-based system later)

---

## 💡 Additional Features Included

### From Gemini CLI:
1. **Tool Call Display** - Show agent context gathering with icons and timing
2. **Settings Dialog** - Configure queue size with RadioButtonSelect
3. **Help System** - `/help` command with formatted shortcuts
4. **Markdown Rendering** - Clean display of HTML emails
5. **Notifications** - Toast messages for user feedback
6. **Loading Phrases** - Rotating messages during AI operations
7. **Responsive Layouts** - Adapt to terminal width changes

### Innovations:
- **Priority Re-queuing** - Revised emails jump to front of queue
- **Consistent Card Layout** - Same structure always, only opacity changes
- **Dynamic Queue Management** - Always keep N emails ready
- **Session Persistence** - Resume exactly where you left off

---

## 📅 Timeline

**Estimated Duration**: 11 weeks

**Milestones**:
- Week 1: StreamingContext + theme + loading phrases
- Week 2: EmailCard components + markdown + tool display
- Week 3: Static layout + navigation + notifications
- Week 4: Slash commands + help dialog
- Week 5: Settings dialog
- Week 6: Auth flow
- Week 7: Dynamic queue + priority re-queuing
- Week 8: Session persistence
- Week 9: Full email view + agent tools
- Week 10: Responsive layouts
- Week 11: Polish + testing

---

## 📚 References

- [Gemini CLI Source](file:///Users/conmeara/code/claude-inbox-main/samples/gemini-cli-main)
- [Ink Documentation](https://github.com/vadimdemedes/ink)
- [Claude Agent SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Marked (Markdown)](https://github.com/markedjs/marked)

---

## ✅ Next Steps

1. **Review and approve this plan**
2. **Set up project tracking** (GitHub issues/milestones)
3. **Begin Phase 1** - StreamingContext, theme, and loading phrases
4. **Weekly demos** - Show progress each week
5. **Iterative refinement** - Adjust plan based on learnings

---

**Last Updated**: 2025-10-06
**Maintained By**: Claude Code
