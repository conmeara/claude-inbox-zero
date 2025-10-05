import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { Email, EmailDraft, EmailQueueItem } from '../types/email.js';
import { AIService } from '../services/ai.js';
import { EmailQueueManager } from '../services/email-queue-manager.js';
import { RefinementQueue } from '../services/refinement-queue.js';
import { InitialGenerationQueue } from '../services/initial-generation-queue.js';
import { MockInboxService } from '../services/mockInbox.js';

interface DraftReviewProps {
  emails: Email[];
  onComplete: (drafts: EmailDraft[]) => void;
  onBack: () => void;
  inboxService: MockInboxService;
  debug?: boolean;
  preInitializedAiService?: AIService | null;
  preInitializedQueueManager?: EmailQueueManager | null;
  preInitializedGenerationQueue?: InitialGenerationQueue | null;
  preInitializedRefinementQueue?: RefinementQueue | null;
}

type ReviewState = 'loading' | 'reviewing' | 'manual-editing' | 'complete' | 'error';

const DraftReview: React.FC<DraftReviewProps> = ({
  emails,
  onComplete,
  onBack,
  inboxService,
  debug = false,
  preInitializedAiService,
  preInitializedQueueManager,
  preInitializedGenerationQueue,
  preInitializedRefinementQueue
}) => {
  const [state, setState] = useState<ReviewState>('loading');
  const [queueManager] = useState(() => preInitializedQueueManager || new EmailQueueManager(emails));
  const [aiService] = useState(() => preInitializedAiService || new AIService(inboxService));
  const [refinementQueue] = useState(() =>
    preInitializedRefinementQueue || new RefinementQueue(aiService.getSessionManager(), aiService.getAgentClient(), 3)
  );
  const [generationQueue] = useState(() => preInitializedGenerationQueue || new InitialGenerationQueue(aiService, 3));

  const [currentItem, setCurrentItem] = useState<EmailQueueItem | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [manualEditInput, setManualEditInput] = useState('');
  const [error, setError] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Initializing...');
  const [backgroundStatus, setBackgroundStatus] = useState<string>('');

  // Initialize
  useEffect(() => {
    async function initialize() {
      try {
        // Skip AI initialization if using pre-initialized service
        if (!preInitializedAiService) {
          setLoadingMessage('Loading AI service...');
          await aiService.initialize();
        }

        // Set up refinement queue listeners
        refinementQueue.onComplete((emailId, result, job) => {
          queueManager.markRefined(emailId, result);

          // Update background status for refinements
          const refining = refinementQueue.getProcessingCount();
          const genPending = generationQueue.getPendingCount();
          if (refining > 0) {
            setBackgroundStatus(`Refining ${refining} draft${refining > 1 ? 's' : ''}...`);
          } else if (genPending > 0) {
            setBackgroundStatus(`Processing ${genPending} emails in background...`);
          } else {
            setBackgroundStatus('');
          }

          // If this is the current email, update it
          if (currentItem?.email.id === emailId) {
            const updated = queueManager.getItem(emailId);
            if (updated) {
              setCurrentItem({ ...updated });
            }
          }
        });

        refinementQueue.onFailed((emailId, err) => {
          console.error(`✗ Refinement failed for email ${emailId}:`, err);
          queueManager.markFailed(emailId, err);

          // Update background status
          const refining = refinementQueue.getProcessingCount();
          const genPending = generationQueue.getPendingCount();
          if (refining > 0) {
            setBackgroundStatus(`Refining ${refining} draft${refining > 1 ? 's' : ''}...`);
          } else if (genPending > 0) {
            setBackgroundStatus(`Processing ${genPending} emails in background...`);
          } else {
            setBackgroundStatus('');
          }
        });

        // Set up initial generation queue listeners
        let firstEmailReady = false;
        generationQueue.onComplete((emailId, summary, draft) => {
          // Update the queue manager
          queueManager.updateSummary(emailId, summary);
          if (draft) {
            queueManager.updateDraft(emailId, draft);
          }

          // Update background status
          const refining = refinementQueue.getProcessingCount();
          const pending = generationQueue.getPendingCount();
          if (refining > 0) {
            setBackgroundStatus(`Refining ${refining} draft${refining > 1 ? 's' : ''}...`);
          } else if (pending > 0) {
            setBackgroundStatus(`Processing ${pending} email${pending > 1 ? 's' : ''}...`);
          } else {
            setBackgroundStatus('');
          }

          // If we're still loading, show the first email now (any email completing triggers this)
          if (!firstEmailReady) {
            firstEmailReady = true;
            setState((prevState) => {
              if (prevState === 'loading') {
                const firstEmail = queueManager.getNext();
                if (firstEmail) {
                  setCurrentItem(firstEmail);
                }
                return 'reviewing';
              }
              return prevState;
            });
          }

          // Force refresh current item if this email was just completed
          setCurrentItem((prevItem) => {
            if (prevItem?.email.id === emailId) {
              const updated = queueManager.getItem(emailId);
              return updated ? { ...updated } : prevItem;
            }
            return prevItem;
          });
        });

        generationQueue.onFailed((emailId, err) => {
          console.error(`✗ Generation failed for email ${emailId}:`, err);
          queueManager.markFailed(emailId, err);

          // Update background status
          const refining = refinementQueue.getProcessingCount();
          const pending = generationQueue.getPendingCount();
          if (refining > 0) {
            setBackgroundStatus(`Refining ${refining} draft${refining > 1 ? 's' : ''}...`);
          } else if (pending > 0) {
            setBackgroundStatus(`Processing ${pending} email${pending > 1 ? 's' : ''}...`);
          } else {
            setBackgroundStatus('');
          }
        });

        // Only enqueue emails if not using pre-initialized queue
        if (!preInitializedGenerationQueue) {
          setLoadingMessage('Processing your emails...');
          for (const email of emails) {
            await generationQueue.enqueue(email);
          }
          setBackgroundStatus(`Processing ${emails.length} email${emails.length > 1 ? 's' : ''}...`);
        } else {
          // If using pre-initialized queues, check if we already have ready items
          let readyCount = 0;
          for (const email of emails) {
            const item = queueManager.getItem(email.id);
            if (item?.summary) readyCount++;
          }

          if (readyCount > 0) {
            // Immediately show first ready email
            firstEmailReady = true;
            const firstEmail = queueManager.getNext();
            if (firstEmail) {
              setCurrentItem(firstEmail);
            }
            setState('reviewing');
          }
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Initialization failed');
        setState('error');
      }
    }

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Load next email IMMEDIATELY without waiting for generation
   * Background queue will populate summary/draft when ready
   */
  const loadNextEmailImmediate = () => {
    const next = queueManager.getNext();

    if (!next) {
      // All done!
      setState('complete');
      onComplete(queueManager.getAcceptedDrafts());
      return;
    }

    // Show email immediately (even if summary/draft not ready yet)
    setCurrentItem(next);
    setState('reviewing');
  };

  /**
   * Legacy function - kept for compatibility but now just calls immediate version
   */
  const loadNextEmail = async () => {
    loadNextEmailImmediate();
  };

  // Keyboard input handling
  useInput((input, key) => {
    if (state === 'reviewing') {
      if (!currentItem) return;

      // Tab - Always accept (mark read and move forward)
      if (key.tab && !key.shift) {
        handleAccept();
      }
      // Shift-Tab - Skip (mark unread and move forward)
      else if (key.tab && key.shift) {
        handleSkip();
      }
      // Cmd+Left Arrow - Navigate backwards
      else if (key.leftArrow && key.meta) {
        handleNavigateBackward();
      }
      // Cmd+Right Arrow - Navigate forwards
      else if (key.rightArrow && key.meta) {
        handleNavigateForward();
      }
      // Control-E - Enter manual edit mode
      else if (key.ctrl && input === 'e') {
        if (currentItem.draft) {
          startManualEditMode();
        }
      }
      // Escape - Clear chat input
      else if (key.escape) {
        setRefinementInput('');
      }
    } else if (state === 'manual-editing' && key.escape) {
      setState('reviewing');
      setManualEditInput('');
    }
  });

  const handleAccept = () => {
    if (!currentItem) return;
    queueManager.markAccepted(currentItem.email.id);
    aiService.getSessionManager().destroySession(currentItem.email.id);
    loadNextEmail();
  };

  const handleSkip = () => {
    if (!currentItem) return;
    queueManager.markSkipped(currentItem.email.id);
    aiService.getSessionManager().destroySession(currentItem.email.id);
    loadNextEmail();
  };

  const handleNavigateBackward = () => {
    const previous = queueManager.getPrevious();
    if (previous) {
      setCurrentItem(previous);
    }
  };

  const handleNavigateForward = () => {
    const next = queueManager.getNextInSequence();
    if (next) {
      setCurrentItem(next);
    }
  };

  const submitRefinement = async () => {
    if (!currentItem || !currentItem.draft || !refinementInput.trim()) {
      return;
    }

    const feedback = refinementInput.trim();

    // Check max turns
    const turnCount = aiService.getSessionManager().getTurnCount(currentItem.email.id);
    if (turnCount >= 10) {
      setError('Maximum refinement limit reached (10 rounds). Please use manual edit instead.');
      setRefinementInput('');
      return;
    }

    // Mark as refining
    queueManager.markRefining(currentItem.email.id, feedback);

    // Enqueue refinement (happens in background)
    await refinementQueue.enqueue(
      currentItem.email.id,
      currentItem.draft.draftContent,
      feedback,
      currentItem.email
    );

    // Update background status
    const refining = refinementQueue.getProcessingCount();
    if (refining > 0) {
      setBackgroundStatus(`Refining ${refining} draft${refining > 1 ? 's' : ''}...`);
    }

    // Clear input
    setRefinementInput('');

    // IMMEDIATELY load next email
    await loadNextEmail();
  };

  const startManualEditMode = () => {
    if (!currentItem?.draft) return;
    setManualEditInput(currentItem.draft.draftContent);
    setState('manual-editing');
  };

  const submitManualEdit = () => {
    if (!currentItem || !currentItem.draft) return;

    // Update the draft with manual edits
    currentItem.draft = {
      ...currentItem.draft,
      draftContent: manualEditInput,
      status: 'edited',
      editedContent: manualEditInput
    };

    queueManager.updateDraft(currentItem.email.id, currentItem.draft);

    setManualEditInput('');
    setState('reviewing');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (state === 'loading') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> {loadingMessage}</Text>
        </Box>
        {backgroundStatus && (
          <Box marginTop={1}>
            <Text color="gray">{backgroundStatus}</Text>
          </Box>
        )}
      </Box>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Text>Press [B] to go back</Text>
      </Box>
    );
  }

  // Complete state
  if (state === 'complete') {
    const stats = queueManager.getStats();
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>✓ All emails processed!</Text>
        <Box marginTop={1}>
          <Text>Total: {stats.total} | Accepted: {stats.accepted} | Skipped: {stats.skipped}</Text>
        </Box>
      </Box>
    );
  }

  if (!currentItem) {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="gray">Loading next email...</Text>
      </Box>
    );
  }

  const queueStatus = queueManager.getStatus();

  // Manual edit mode
  if (state === 'manual-editing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan" bold>✏️ Edit Draft Manually</Text>
        </Box>

        <Box marginBottom={1}>
          <TextInput
            value={manualEditInput}
            onChange={setManualEditInput}
            onSubmit={submitManualEdit}
            placeholder="Type your draft..."
          />
        </Box>

        <Box flexDirection="column">
          <Text color="cyan">Press [Enter] to save, [Escape] to cancel</Text>
        </Box>
      </Box>
    );
  }

  // Main review state
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header with queue status */}
      <Box marginBottom={1} flexDirection="column">
        <Text color="cyan" bold>
          📧 Email Review
        </Text>
        {(queueStatus.primaryRemaining > 0 || queueStatus.refinedWaiting > 0) && (
          <Text color="gray">
            {queueStatus.primaryRemaining > 0 ? `${queueStatus.primaryRemaining} unprocessed` : ''}
            {queueStatus.refinedWaiting > 0 ? ` | ${queueStatus.refinedWaiting} refined ready` : ''}
          </Text>
        )}
      </Box>

      {/* Show if this is a refined version */}
      {currentItem.state === 'refined' && (
        <Box marginBottom={1}>
          <Text color="green">✓ This draft was refined based on your feedback!</Text>
          {currentItem.refinementFeedback && (
            <Text color="gray"> (You asked: "{currentItem.refinementFeedback}")</Text>
          )}
        </Box>
      )}

      {/* Email context */}
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text color="gray">From: </Text>
          <Text color="green" bold>{currentItem.email.from.name}</Text>
        </Box>
        <Box>
          <Text color="gray">Subject: </Text>
          <Text color="white">"{currentItem.email.subject}"</Text>
        </Box>
        <Box>
          <Text color="gray">Date: </Text>
          <Text color="gray">{formatDate(currentItem.email.date)}</Text>
        </Box>
      </Box>

      {/* AI Summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text color="yellow">💡 Summary:</Text>
        <Box marginLeft={2}>
          {currentItem.summary ? (
            <Text color="white">{currentItem.summary}</Text>
          ) : (
            <Text color="gray">
              <Spinner type="dots" /> Generating summary...
            </Text>
          )}
        </Box>
      </Box>

      {/* Draft or informational message */}
      {currentItem.draft ? (
        <>
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>📝 Draft Reply:</Text>
            <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
            <Box marginLeft={2} marginY={1}>
              <Text color="white">{currentItem.draft.draftContent}</Text>
            </Box>
            <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          </Box>

          {/* Chat input */}
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color="cyan">&gt; </Text>
              <TextInput
                value={refinementInput}
                onChange={setRefinementInput}
                onSubmit={submitRefinement}
                placeholder="Ask AI to do anything (e.g. make it longer, add urgency, change tone)"
              />
            </Box>
            <Box marginTop={1}>
              <Text color="gray">&gt;&gt; </Text>
              <Text color="cyan">[Tab] Accept  [⇧Tab] Skip  [⌘←→] Navigate  [^E] Manual Edit  [Esc] Clear</Text>
            </Box>
            {(currentItem.refinementCount ?? 0) > 0 && (
              <Text color="gray">
                (Refined {currentItem.refinementCount}x)
              </Text>
            )}
          </Box>
        </>
      ) : currentItem.email.requiresResponse ? (
        <>
          <Box flexDirection="column" marginBottom={1}>
            <Text color="yellow" bold>📝 Draft Reply:</Text>
            <Box marginLeft={2} marginY={1}>
              <Text color="gray">
                <Spinner type="dots" /> Generating draft reply...
              </Text>
            </Box>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">
              [Tab] Accept  [⇧Tab] Skip  [⌘←→] Navigate
            </Text>
            <Text color="gray" dimColor>
              (Draft will be ready shortly)
            </Text>
          </Box>
        </>
      ) : (
        <>
          <Box flexDirection="column" marginBottom={1}>
            <Text color="blue">ℹ️  This email is informational only - no response needed.</Text>
          </Box>

          <Box flexDirection="column" marginTop={1}>
            <Text color="cyan">
              [Tab] Accept  [⇧Tab] Skip  [⌘←→] Navigate
            </Text>
          </Box>
        </>
      )}

      {/* Progress indicator */}
      <Box marginTop={1} justifyContent="space-between">
        <Text color="gray">
          Progress: {queueStatus.completed}/{queueStatus.completed + queueStatus.primaryRemaining + queueStatus.refinedWaiting + queueStatus.refining} emails
        </Text>
        {backgroundStatus && (
          <Text color="cyan">
            <Spinner type="dots" /> {backgroundStatus}
          </Text>
        )}
      </Box>

      {/* Debug info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Current state: {currentItem.state}</Text>
          <Text color="gray">- Queue status: {JSON.stringify(queueStatus)}</Text>
          <Text color="gray">- Refinement count: {currentItem.refinementCount || 0}</Text>
        </Box>
      )}
    </Box>
  );
};

export default DraftReview;
