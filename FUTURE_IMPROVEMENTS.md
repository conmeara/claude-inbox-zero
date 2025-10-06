# Future Improvements - Comprehensive Roadmap

Based on analysis of Gemini CLI and CLI best practices, here are potential improvements organized by priority.

---

## 🔥 **High Priority - User Experience**

### 1. **Settings Dialog** (Gemini CLI has this)
A full-featured settings interface accessible via `/settings` command.

**Features to implement:**
- Toggle API key visibility
- Configure default email mode (mock/gmail/imap)
- Set batch size for email processing
- Enable/disable auto-drafting
- Configure writing style preferences
- Keyboard shortcuts customization

**Gemini CLI reference:** `packages/cli/src/ui/components/SettingsDialog.tsx`

**Files to create:**
```
src/components/dialogs/SettingsDialog.tsx
src/utils/settings-manager.ts
~/.claude-inbox/settings.json
```

---

### 2. **Confirmation Dialogs**
Better user confirmations for destructive actions.

**Use cases:**
- "Are you sure you want to delete all drafts?"
- "Sync will download 1000+ emails. Continue?"
- "Mark 50 emails as read?"
- "Reset inbox to initial state?"

**Pattern from Gemini:**
```tsx
<ConfirmationDialog
  title="Reset Inbox?"
  message="This will mark all emails as unread. Continue?"
  onConfirm={() => handleReset()}
  onCancel={() => setState('dashboard')}
/>
```

**Files to create:**
```
src/components/dialogs/ConfirmationDialog.tsx
src/hooks/useConfirmation.ts
```

---

### 3. **Keyboard Shortcuts Reference**
Show available shortcuts via `/shortcuts` or `?` key.

**Shortcuts to document:**
- `↑↓` - Navigate emails
- `Tab` - Autocomplete commands
- `Enter` - Accept/Submit
- `Esc` - Cancel/Clear
- `Ctrl+C` - Exit
- `e` - Edit draft
- `s` - Skip email
- `/` - Command mode

**Files to create:**
```
src/components/dialogs/ShortcutsHelp.tsx
src/utils/keyboard-shortcuts.ts
```

---

### 4. **Better Error Handling**
Graceful error display with actionable suggestions.

**Improvements:**
- Error boundary components
- Friendly error messages
- Retry buttons
- Error logging to file
- Crash recovery

**Example:**
```
❌ Failed to sync emails

Reason: IMAP connection timeout

Suggestions:
  • Check your internet connection
  • Verify IMAP settings in ~/.claude-inbox/imap-config.json
  • Try running: claude-inbox test-connection

Press R to retry, Q to quit
```

**Files to create:**
```
src/components/ErrorBoundary.tsx
src/components/ErrorDisplay.tsx
src/utils/error-handler.ts
~/.claude-inbox/logs/errors.log
```

---

## ⚡ **High Priority - Features**

### 5. **Email Search & Filter**
Full-text search across emails with filters.

**Features:**
- Search by sender, subject, body
- Filter by date range
- Filter by read/unread status
- Filter by has attachment
- Save search filters

**Commands:**
```bash
/search "quarterly report"
/filter from:alice@company.com
/filter unread newer_than:7d
```

**Files to create:**
```
src/components/EmailSearch.tsx
src/utils/email-filters.ts
```

---

### 6. **Progress Bars & Better Feedback**
Show progress for long operations.

**Use cases:**
- Email sync progress
- Batch processing progress
- AI generation progress
- File upload progress

**Example:**
```
Syncing emails... ████████████░░░░░░░░ 60% (600/1000)
Time remaining: ~2 minutes
```

**Package:** `ink-progress-bar`

**Files to create:**
```
src/components/shared/ProgressBar.tsx
```

---

### 7. **History Navigation**
Navigate command/input history with arrow keys.

**Features:**
- Up/down arrows to browse history
- Persistent history across sessions
- Search history with Ctrl+R
- Clear history command

**Files to create:**
```
src/hooks/useInputHistory.ts
~/.claude-inbox/history.txt
```

---

### 8. **Email Templates**
Pre-defined response templates.

**Features:**
- Quick reply templates
- Custom templates
- Template variables (name, date, etc)
- Template library

**Example templates:**
```
/template thanks
→ "Thank you for reaching out. I'll get back to you soon."

/template meeting
→ "I'd be happy to meet. I'm available [times]. What works for you?"
```

**Files to create:**
```
src/utils/templates.ts
~/.claude-inbox/templates.json
```

---

## 💡 **Medium Priority - Polish**

### 9. **Update Notifications** (Gemini CLI has this)
Notify users of new versions.

**Features:**
- Check for updates on startup
- Show changelog highlights
- Auto-update prompt
- Version info in footer

**Package:** `update-notifier`

**Files to create:**
```
src/utils/update-checker.ts
```

---

### 10. **Session Checkpointing**
Save and resume processing sessions.

**Features:**
- Auto-save every N emails
- Resume from last checkpoint
- Multiple saved sessions
- Session history

**Commands:**
```bash
/save session-name
/load session-name
/sessions list
```

**Files to create:**
```
src/utils/session-manager.ts
~/.claude-inbox/sessions/*.json
```

---

### 11. **Email Preview Improvements**
Better email rendering in terminal.

**Features:**
- HTML to terminal markdown
- Syntax highlighting for code blocks
- Image placeholders
- Attachment list
- Thread view
- Quoted text collapse

**Packages:**
- `html-to-text`
- `marked-terminal`
- `highlight.js`

**Files to create:**
```
src/utils/email-renderer.ts
src/components/EmailPreview.tsx
```

---

### 12. **Themes** (Gemini CLI has this)
Custom color themes.

**Pre-defined themes:**
- Dark (default)
- Light
- Solarized
- Dracula
- Nord

**Access:** `/theme` command

**Files to create:**
```
src/themes/index.ts
src/components/dialogs/ThemeDialog.tsx
```

---

## 🚀 **Medium Priority - Developer Experience**

### 13. **Better Logging**
Structured logging with levels.

**Features:**
- Log levels: debug, info, warn, error
- File logging
- Console logging (dev mode)
- Log rotation
- Search logs

**Package:** `pino`

**Files to create:**
```
src/utils/logger.ts
~/.claude-inbox/logs/app.log
```

---

### 14. **Config File Support**
YAML/JSON config files for settings.

**Example config:**
```yaml
# ~/.claude-inbox/config.yml
mode: imap
model: claude-sonnet-4
batch_size: 10
auto_draft: true

writing_style:
  tone: professional
  length: concise

imap:
  host: imap.gmail.com
  port: 993
  email: user@gmail.com
```

**Package:** `js-yaml`

**Files to create:**
```
src/utils/config-loader.ts
~/.claude-inbox/config.yml
```

---

### 15. **Testing Infrastructure**
Unit and integration tests.

**Setup:**
- Unit tests for utilities
- Component tests for React
- Integration tests for flows
- E2E tests for critical paths
- CI/CD pipeline

**Package:** `vitest`, `testing-library`

**Files to create:**
```
src/**/*.test.ts
tests/integration/**/*.test.ts
.github/workflows/test.yml
```

---

### 16. **Debug Mode Enhancements**
Better debugging tools.

**Features:**
- Verbose logging
- State inspector
- Performance profiler
- Network request logs
- Component tree view

**Access:** `--debug` flag

---

## 🎯 **Low Priority - Advanced Features**

### 17. **Plugin System**
Allow custom extensions.

**Features:**
- Custom slash commands
- Custom email processors
- Custom UI components
- Plugin marketplace

**Example:**
```typescript
// ~/.claude-inbox/plugins/my-plugin.js
export default {
  name: 'my-plugin',
  commands: {
    '/summarize': async (email) => {
      // Custom summarization logic
    }
  }
}
```

---

### 18. **Multi-Account Support**
Switch between multiple email accounts.

**Features:**
- Account profiles
- Quick switching
- Unified inbox
- Per-account settings

**Commands:**
```bash
/accounts list
/accounts switch work
/accounts add personal
```

---

### 19. **Email Scheduling**
Schedule draft sends.

**Features:**
- Send later
- Recurring sends
- Time zone support
- Send reminders

**Commands:**
```bash
/schedule tomorrow 9am
/schedule friday 2pm
```

---

### 20. **Analytics Dashboard**
Email processing stats.

**Metrics:**
- Emails processed per day
- Average processing time
- Draft acceptance rate
- Most common senders
- Busiest times

**Access:** `/stats` command

---

### 21. **Vim Mode** (Gemini CLI has this)
Full vim keybindings.

**Features:**
- Normal/Insert/Visual modes
- Vim motions (hjkl, w, b, etc)
- Vim commands (:w, :q, etc)
- Custom .vimrc equivalent

**Package:** Custom implementation

**Files to create:**
```
src/utils/vim-mode.ts
src/contexts/VimModeContext.tsx
```

---

### 22. **Internationalization (i18n)**
Multi-language support.

**Languages:**
- English (default)
- Spanish
- French
- German
- Japanese

**Package:** `i18next`

---

### 23. **Cloud Sync**
Sync settings/sessions across devices.

**Features:**
- Cloud storage integration
- Cross-device sync
- Encrypted backups
- Conflict resolution

---

### 24. **AI Model Selection**
Switch between different models.

**Models:**
- claude-sonnet-4 (default)
- claude-opus-4
- claude-haiku-4

**Access:** `/model` command

---

### 25. **Voice Input** (Experimental)
Speech-to-text for email responses.

**Features:**
- Microphone input
- Real-time transcription
- Edit before sending

---

## 📊 **Implementation Priority Matrix**

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Settings Dialog | High | Medium | ⭐⭐⭐⭐⭐ |
| Confirmation Dialogs | High | Low | ⭐⭐⭐⭐⭐ |
| Error Handling | High | Medium | ⭐⭐⭐⭐⭐ |
| Email Search | High | High | ⭐⭐⭐⭐ |
| Progress Bars | Medium | Low | ⭐⭐⭐⭐ |
| Keyboard Shortcuts Help | Medium | Low | ⭐⭐⭐⭐ |
| History Navigation | Medium | Medium | ⭐⭐⭐⭐ |
| Email Templates | Medium | Medium | ⭐⭐⭐ |
| Update Notifications | Low | Low | ⭐⭐⭐ |
| Session Checkpointing | Medium | High | ⭐⭐⭐ |
| Themes | Low | Low | ⭐⭐⭐ |
| Better Logging | High | Medium | ⭐⭐⭐ |
| Config Files | Medium | Medium | ⭐⭐ |
| Testing | High | High | ⭐⭐ |
| Multi-Account | Medium | High | ⭐ |
| Analytics | Low | Medium | ⭐ |

---

## 🎨 **Quick Wins** (Low Effort, High Impact)

1. **Confirmation Dialogs** - 2-3 hours
2. **Progress Bars** - 2-3 hours
3. **Keyboard Shortcuts Help** - 3-4 hours
4. **Update Notifications** - 2 hours
5. **Themes** - 4-5 hours

---

## 🏗️ **Foundation Work** (Enables Future Features)

1. **Better Error Handling** - Enables debugging and reliability
2. **Better Logging** - Enables troubleshooting
3. **Config File Support** - Enables customization
4. **Testing Infrastructure** - Enables confident refactoring

---

## 📝 **Next 3 Features to Implement**

Based on impact vs. effort:

### **#1: Settings Dialog**
- Most requested by users
- Enables configuration without editing JSON
- ~8 hours of work

### **#2: Confirmation Dialogs**
- Prevents accidental data loss
- Improves UX significantly
- ~3 hours of work

### **#3: Email Search**
- High value for power users
- Differentiating feature
- ~12 hours of work

---

Would you like me to implement any of these? I'd recommend starting with the **Quick Wins** to get immediate UX improvements!
