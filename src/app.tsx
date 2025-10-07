import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { EmailService } from './services/email-service.js';
import { Email, EmailDraft } from './types/email.js';
import { AIService } from './services/ai.js';
import { EmailQueueManager } from './services/email-queue-manager.js';
import { InitialGenerationQueue } from './services/initial-generation-queue.js';
import { RefinementQueue } from './services/refinement-queue.js';
import { ConfigService } from './services/config.js';
import Dashboard from './components/Dashboard.js';
import DraftReview from './components/DraftReview.js';
import { DefaultLayout } from './components/layouts/DefaultLayout.js';
import { ConfigProvider } from './contexts/ConfigContext.js';
import { UIStateProvider } from './contexts/UIStateContext.js';
import { SetupWizard } from './components/setup/SetupWizard.js';
import { isFirstRun } from './utils/first-run-config.js';

interface AppProps {
  resetInbox?: boolean;
  debug?: boolean;
  useImap?: boolean;
  concurrency?: number;
}

type AppState = 'setup' | 'loading' | 'dashboard' | 'reviewing' | 'complete' | 'error';

const AppContent: React.FC<AppProps> = ({ resetInbox = false, debug = false, useImap = false, concurrency: concurrencyProp }) => {
  // Determine concurrency: CLI option > env var > default (10)
  const configService = new ConfigService();
  const concurrency = concurrencyProp || configService.getConcurrency();
  const [state, setState] = useState<AppState>('loading');
  const [error, setError] = useState<string>('');
  const [setupConfig, setSetupConfig] = useState<{ emailMode: 'mock' | 'imap'; hasApiKey: boolean } | null>(null);
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

  // Check for first run on mount
  useEffect(() => {
    if (isFirstRun()) {
      setState('setup');
    } else {
      // Proceed with normal initialization
      initializeApp();
    }

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

        const refQueue = new RefinementQueue(ai.getSessionManager(), ai.getAgentClient(), concurrency);
        const genQueue = new InitialGenerationQueue(ai, concurrency);

        // Set up generation queue listeners
        genQueue.onComplete((emailId, summary, draft) => {
          manager.updateSummary(emailId, summary);
          if (draft) {
            manager.updateDraft(emailId, draft);
          }

          // Update ready count using queue manager's accurate method
          setReadyCount(manager.getReadyCount());
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

        // Enqueue ALL emails - the queue will process up to 'concurrency' at a time
        // This ensures all emails are eventually processed, not just the first batch
        for (const email of emails) {
          genQueue.enqueue(email); // No await - enqueue all immediately!
        }
        // Processing count will be managed by queue (up to concurrency limit)
        setProcessingCount(Math.min(concurrency, emails.length));
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
      <DefaultLayout>
        <Box flexDirection="column" paddingY={1}>
          <Text color="cyan">Welcome to Claude Inbox Zero</Text>
          <Text>Loading your inbox...</Text>
        </Box>
      </DefaultLayout>
    );
  }

  const handleSetupComplete = async (config: { emailMode: 'mock' | 'imap'; hasApiKey: boolean }) => {
    setSetupConfig(config);
    setState('loading');

    // Reinitialize the app with the configured mode
    try {
      await inboxService.loadInboxData();

      if (resetInbox) {
        await inboxService.resetInbox();
      }

      const unread = inboxService.getUnreadEmails();
      setEmails(unread);

      setState('dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize app');
      setState('error');
    }
  };

  if (state === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (state === 'error') {
    return (
      <DefaultLayout>
        <Box flexDirection="column" paddingY={1}>
          <Text color="red">Error: {error}</Text>
          <Text>Press Ctrl+C to exit</Text>
        </Box>
      </DefaultLayout>
    );
  }

  if (state === 'dashboard') {
    return (
      <DefaultLayout>
        <Dashboard
          inboxService={inboxService}
          debug={debug}
          onStartBatch={handleStartBatch}
          batchOffset={batchOffset}
          readyCount={readyCount}
          processingCount={processingCount}
          concurrency={concurrency}
        />
      </DefaultLayout>
    );
  }

  if (state === 'complete') {
    const acceptedCount = processedDrafts.filter(d => d.status === 'accepted').length;
    const skippedCount = processedDrafts.filter(d => d.status === 'skipped').length;

    return (
      <DefaultLayout>
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
      </DefaultLayout>
    );
  }

  if (state === 'reviewing') {
    return (
      <DefaultLayout>
        <DraftReview
          emails={emails}
          inboxService={inboxService}
          onComplete={handleReviewComplete}
          onBack={handleBack}
          debug={debug}
          concurrency={concurrency}
          preInitializedAiService={aiService}
          preInitializedQueueManager={queueManager}
          preInitializedGenerationQueue={generationQueue}
          preInitializedRefinementQueue={refinementQueue}
        />
      </DefaultLayout>
    );
  }

  return null;
};

// Main App component with context providers
const App: React.FC<AppProps> = (props) => {
  const { debug = false, useImap = false } = props;

  const config = {
    mode: useImap ? ('imap' as const) : ('mock' as const),
    modelName: 'claude-sonnet-4',
    debug,
    resetInbox: props.resetInbox || false,
  };

  return (
    <ConfigProvider config={config}>
      <UIStateProvider>
        <AppContent {...props} />
      </UIStateProvider>
    </ConfigProvider>
  );
};

export default App;