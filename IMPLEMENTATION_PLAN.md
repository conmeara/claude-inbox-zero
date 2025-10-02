# Implementation Plan: Async Multi-Turn Email Refinement

## Architecture Summary
- **Session Strategy**: One session per email (Option B)
- **Async Processing**: Job queue for background refinements
- **UX**: User never waits - always moving forward
- **Queue**: Refined emails return to queue for review

---

## Phase 1: Core Infrastructure (Day 1-2)

### 1.1 Update Dependencies
**File**: `package.json`
- Replace `@anthropic-ai/claude-code` with `@anthropic-ai/claude-agent` (v1.0.120+)
- Update all imports across codebase

### 1.2 Create Session Manager
**File**: `src/services/session-manager.ts` (NEW)
- `EmailSession` class - manages one session per email
- Captures session ID on first turn
- Uses `resume` option for subsequent refinements
- Tracks turn count and message history
- Cleanup method to free memory

**File**: `src/services/session-manager.ts`
```typescript
class SessionManager {
  createSession(emailId: string): EmailSession
  getSession(emailId: string): EmailSession | undefined
  destroySession(emailId: string): void
}

class EmailSession {
  sessionId: string | null
  turnCount: number
  refine(currentDraft, feedback, email): Promise<string>
  cleanup(): void
}
```

### 1.3 Create Agent Client with Custom Tools
**File**: `src/services/agent-client.ts` (NEW)
- Wrapper around Claude Agent SDK
- Custom MCP tools:
  - `search_inbox` - Search mock emails by sender, subject, requiresResponse
  - `read_email` - Get full email by ID
- System prompt for draft refinement
- Streaming support with progress callbacks

### 1.4 Create Refinement Queue
**File**: `src/services/refinement-queue.ts` (NEW)
- Background job processor
- Max 3 concurrent refinements
- Job states: queued → processing → complete/failed
- Event callbacks when refinement completes
- Uses SessionManager for multi-turn conversations

---

## Phase 2: Queue Management (Day 2-3)

### 2.1 Email State System
**File**: `src/types/email.ts` (MODIFY)
- Add `EmailState` type: queued | reviewing | refining | refined | accepted | skipped | failed
- Add `EmailQueueItem` interface with state tracking

### 2.2 Create Queue Manager
**File**: `src/services/email-queue-manager.ts` (NEW)
- Three queues:
  - `primaryQueue`: unprocessed emails
  - `refinedQueue`: completed refinements (higher priority)
  - `completedQueue`: accepted/skipped emails
- Methods:
  - `getNext()` - returns next email (refined queue first, then primary)
  - `markRefining(emailId)` - move to background
  - `markRefined(emailId, newDraft)` - add to refined queue
  - `markAccepted/markSkipped` - move to completed
  - `getStatus()` - counts for UI

### 2.3 Add Mock Inbox Search
**File**: `src/services/mockInbox.ts` (MODIFY)
- Add `search(query)` method for tool access
- Add `getById(emailId)` method for read_email tool
- Filter by sender, subject, requiresResponse

---

## Phase 3: Update AI Service (Day 3)

### 3.1 Refactor AIService
**File**: `src/services/ai.ts` (MAJOR REFACTOR)
- Remove direct SDK calls
- Use `AgentClient` instead
- Add `SessionManager` integration
- New method: `refineEmailDraft(emailId, currentDraft, feedback)`
  - Gets session from SessionManager
  - Calls `session.refine()` with feedback
  - Returns refined draft
- Keep existing batch processing for initial drafts (non-multi-turn)

---

## Phase 4: Update DraftReview Component (Day 4-5)

### 4.1 Integrate Queue System
**File**: `src/components/DraftReview.tsx` (MAJOR REFACTOR)
- Replace linear processing with `EmailQueueManager`
- Initialize `RefinementQueue` and `SessionManager`
- Listen for refinement completion events
- Track current email from queue manager

### 4.2 Add Refinement Mode
- New state: `'refining-prompt'` - collecting user feedback
- New UI mode for entering refinement instructions
- Detect natural language vs full edit
- Examples shown to user:
  - "make more formal"
  - "shorter"
  - "add urgency"
  - "mention deadline is Friday"

### 4.3 Async Flow Implementation
```typescript
handleRefineRequest(feedback: string) {
  // 1. Mark current email as refining
  queueManager.markRefining(currentEmail.id)

  // 2. Enqueue background refinement
  refinementQueue.enqueue(
    currentEmail.id,
    currentDraft,
    feedback,
    email
  )

  // 3. IMMEDIATELY load next email
  loadNextEmail()

  // 4. Update queue status display
  updateStatusBar()
}

// Event handler (set in useEffect)
refinementQueue.onComplete((emailId, refinedDraft) => {
  // 1. Mark as refined in queue manager
  queueManager.markRefined(emailId, refinedDraft)

  // 2. Update status display (don't interrupt current review)
  updateStatusBar()

  // 3. Log for debugging
  console.log(`✓ Email ${emailId} refined`)
})
```

### 4.4 Enhanced Status Display
```
┌─────────────────────────────────────────┐
│ Email Review                             │
│ 7 unprocessed | 2 refined ready          │
│ [3 refining in background]               │
└─────────────────────────────────────────┘
```

### 4.5 Keyboard Shortcuts
- `[Tab]` - Accept draft
- `[R]` - Refine with AI (enter refinement mode)
- `[E]` - Manual edit (full text replacement)
- `[S]` - Skip
- `[B]` - Back

---

## Phase 5: Enhanced UX (Day 5-6)

### 5.1 Add Refined Email Indicator
- When showing refined email, display: "✓ Refined based on your feedback"
- Show original feedback: "You asked: 'make more urgent'"
- Allow re-refinement: can refine again if not satisfied

### 5.2 Background Activity Indicators
- Spinner for active refinements
- Queue status always visible
- Notification when refinement completes (non-blocking)

### 5.3 Cost and Duration Tracking
- Track cost per email (from SDK result messages)
- Track duration per refinement
- Show summary at end:
  ```
  ✓ Processed 10 emails in 3m 15s
  ✓ Total cost: $0.23
  ✓ 8 drafts accepted, 2 skipped
  ✓ 5 drafts refined (12 total refinement rounds)
  ```

---

## Phase 6: Error Handling and Edge Cases (Day 6)

### 6.1 Refinement Failures
- If refinement job fails, notify user
- Provide option to retry or skip
- Show in refined queue with error indicator
- Don't block workflow

### 6.2 Max Turns Limit
- Limit: 10 refinement rounds per email
- Warn at 8 turns: "You've refined this 8 times. Consider manual edit?"
- Hard stop at 10: "Max refinements reached"

### 6.3 Cost Limits
- Track running total cost
- Warn if exceeds $1: "Cost is $1.25. Continue?"
- Option to disable checks

### 6.4 Cleanup
- Destroy sessions when emails completed
- Clear refinement queue on exit
- Option to save pending refinements (future)

---

## Phase 7: Testing and Polish (Day 7)

### 7.1 Test Scenarios
1. Single refinement → accept
2. Multiple refinements → accept
3. Start refinement → skip to next → review refined later
4. Concurrent refinements (3+ at once)
5. Refinement failure handling
6. Max turns reached
7. All emails processed, then review refined queue

### 7.2 Performance Testing
- 25 emails batch
- Multiple concurrent refinements
- Memory usage (session cleanup)
- Cost tracking accuracy

### 7.3 Documentation
- Update README with new refinement feature
- Add examples of refinement commands
- Document keyboard shortcuts
- Update CLAUDE.md with architecture notes

---

## File Summary

### New Files (5)
1. `src/services/session-manager.ts` - Email session management
2. `src/services/agent-client.ts` - Claude Agent SDK wrapper
3. `src/services/refinement-queue.ts` - Background job processor
4. `src/services/email-queue-manager.ts` - Queue state management
5. `src/services/custom-tools.ts` - MCP tools for mock inbox

### Modified Files (5)
1. `src/services/ai.ts` - Use new infrastructure
2. `src/services/mockInbox.ts` - Add search/getById methods
3. `src/components/DraftReview.tsx` - Async queue system
4. `src/types/email.ts` - Add new types
5. `package.json` - Update to claude-agent

---

## Key Decisions

✅ **One session per email** - isolated, cleaner
✅ **Refined emails go to separate queue** - reviewed after primary queue
✅ **Max 3 concurrent refinements** - prevent rate limits
✅ **Non-blocking notifications** - never interrupt user flow
✅ **Max 10 refinement rounds per email** - prevent infinite loops
✅ **Session cleanup after accept/skip** - free memory
✅ **Tools for mock inbox** - demonstrate agentic behavior

---

## Timeline: 7 Days
- Day 1-2: Core infrastructure (Session, Agent, Tools)
- Day 2-3: Queue management system
- Day 3: Refactor AI service
- Day 4-5: Update DraftReview component
- Day 5-6: Enhanced UX and tracking
- Day 6: Error handling
- Day 7: Testing and polish

---

## Expected Outcome
User can process 10 emails, request AI refinements on multiple drafts, and never wait. Refinements happen in background using multi-turn sessions, and refined emails return to queue for review. Blazing fast UX with powerful AI capabilities.
