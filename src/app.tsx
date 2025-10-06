import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { EmailService } from './services/email-service.js';
import { Email, EmailDraft } from './types/email.js';
import { AIService } from './services/ai.js';
import { EmailQueueManager } from './services/email-queue-manager.js';
import { InitialGenerationQueue } from './services/initial-generation-queue.js';
import { RefinementQueue } from './services/refinement-queue.js';
import Dashboard from './components/Dashboard.js';
import DraftReview from './components/DraftReview.js';

interface AppProps {
  resetInbox?: boolean;
  debug?: boolean;
  useImap?: boolean;
}

type AppState = 'loading' | 'dashboard' | 'reviewing' | 'complete' | 'error';

const App: React.FC<AppProps> = ({ resetInbox = false, debug = false, useImap = false }) => {
  const [state, setState] = useState<AppState>('loading');
  const [error, setError] = useState<string>('');
  const [inboxService] = useState(() => {
    if (useImap) return new EmailService('imap');
    return new EmailService('mock');
  });
  const [emails, setEmails] = useState<Email[]>([]);
  const [processedDrafts, setProcessedDrafts] = useState<EmailDraft[]>([]);
  const [batchOffset, setBatchOffset] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [processingCount, setProcessingCount] = useState(0);

  // Services for background processing
  const [aiService, setAiService] = useState<AIService | null>(null);
  const [queueManager, setQueueManager] = useState<EmailQueueManager | null>(null);
  const [generationQueue, setGenerationQueue] = useState<InitialGenerationQueue | null>(null);
  const [refinementQueue, setRefinementQueue] = useState<RefinementQueue | null>(null);

  const { exit } = useApp();

  useEffect(() => {
    async function initializeApp() {
      try {
        await inboxService.loadInboxData();

        if (resetInbox) {
          await inboxService.resetInbox();
        }

        // Get unread emails
        const unread = inboxService.getUnreadEmails();
        setEmails(unread);

        setState('dashboard');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setState('error');
      }
    }

    initializeApp();
  }, [inboxService, resetInbox]);

  // Initialize background processing when entering dashboard
  useEffect(() => {
    if (state !== 'dashboard' || emails.length === 0) {
      return;
    }

    async function initializeBackgroundProcessing() {
      try {
        // Create services
        const ai = new AIService(inboxService);
        const manager = new EmailQueueManager(emails);
        await ai.initialize();

        const refQueue = new RefinementQueue(ai.getSessionManager(), ai.getAgentClient(), 3);
        const genQueue = new InitialGenerationQueue(ai, 3);

        // Set up generation queue listeners
        genQueue.onComplete((emailId, summary, draft) => {
          manager.updateSummary(emailId, summary);
          if (draft) {
            manager.updateDraft(emailId, draft);
          }

          // Update ready count (items with summaries are ready)
          let ready = 0;
          for (let i = 0; i < emails.length; i++) {
            const item = manager.getItem(emails[i].id);
            if (item?.summary) ready++;
          }
          setReadyCount(ready);
          setProcessingCount(genQueue.getProcessingCount());
        });

        genQueue.onFailed((emailId, err) => {
          console.error(`Failed to generate for email ${emailId}:`, err);
          manager.markFailed(emailId, err);
          setProcessingCount(genQueue.getProcessingCount());
        });

        // Store services in state
        setAiService(ai);
        setQueueManager(manager);
        setGenerationQueue(genQueue);
        setRefinementQueue(refQueue);

        // Start processing first 3 emails
        const emailsToProcess = emails.slice(0, 3);
        for (const email of emailsToProcess) {
          await genQueue.enqueue(email);
        }
        setProcessingCount(3);
      } catch (err) {
        console.error('Failed to initialize background processing:', err);
      }
    }

    initializeBackgroundProcessing();
  }, [state, emails, inboxService]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      exit();
    }
  });

  const handleStartBatch = () => {
    setState('reviewing');
  };

  const handleReviewComplete = async (drafts: EmailDraft[]) => {
    // Mark all processed emails as read
    const emailIdsToMarkRead = drafts
      .filter(draft => draft.status === 'accepted' || draft.status === 'skipped')
      .map(draft => draft.emailId);

    if (emailIdsToMarkRead.length > 0) {
      await inboxService.markEmailsAsRead(emailIdsToMarkRead);
    }

    setProcessedDrafts(drafts);
    setState('complete');
  };

  const handleBack = () => {
    // Allow going back to dashboard
    setState('dashboard');
  };

  if (state === 'loading') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan">Welcome to Claude Inbox</Text>
        <Text>Loading your inbox...</Text>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">Error: {error}</Text>
        <Text>Press Ctrl+C to exit</Text>
      </Box>
    );
  }

  if (state === 'dashboard') {
    return (
      <Dashboard
        inboxService={inboxService}
        debug={debug}
        onStartBatch={handleStartBatch}
        batchOffset={batchOffset}
        readyCount={readyCount}
        processingCount={processingCount}
      />
    );
  }

  if (state === 'complete') {
    const acceptedCount = processedDrafts.filter(d => d.status === 'accepted').length;
    const skippedCount = processedDrafts.filter(d => d.status === 'skipped').length;

    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>🎉 Inbox Zero Achieved!</Text>
        <Text>All unread emails have been processed.</Text>
        <Box marginTop={1}>
          <Text>✓ {acceptedCount} drafts accepted</Text>
        </Box>
        <Box>
          <Text>✓ {skippedCount} emails skipped</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="cyan">Press Ctrl+C to exit</Text>
        </Box>
      </Box>
    );
  }

  if (state === 'reviewing') {
    return (
      <DraftReview
        emails={emails}
        inboxService={inboxService}
        onComplete={handleReviewComplete}
        onBack={handleBack}
        debug={debug}
        preInitializedAiService={aiService}
        preInitializedQueueManager={queueManager}
        preInitializedGenerationQueue={generationQueue}
        preInitializedRefinementQueue={refinementQueue}
      />
    );
  }

  return null;
};

export default App;