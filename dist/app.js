import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { EmailService } from './services/email-service.js';
import { AIService } from './services/ai.js';
import { EmailQueueManager } from './services/email-queue-manager.js';
import { InitialGenerationQueue } from './services/initial-generation-queue.js';
import { RefinementQueue } from './services/refinement-queue.js';
import Dashboard from './components/Dashboard.js';
import DraftReview from './components/DraftReview.js';
import { DefaultLayout } from './components/layouts/DefaultLayout.js';
import { ConfigProvider } from './contexts/ConfigContext.js';
import { UIStateProvider } from './contexts/UIStateContext.js';
import { SetupWizard } from './components/setup/SetupWizard.js';
import { isFirstRun } from './utils/first-run-config.js';
const AppContent = ({ resetInbox = false, debug = false, useImap = false }) => {
    const [state, setState] = useState('loading');
    const [error, setError] = useState('');
    const [setupConfig, setSetupConfig] = useState(null);
    const [inboxService] = useState(() => {
        if (useImap)
            return new EmailService('imap');
        return new EmailService('mock');
    });
    const [emails, setEmails] = useState([]);
    const [processedDrafts, setProcessedDrafts] = useState([]);
    const [batchOffset, setBatchOffset] = useState(0);
    const [readyCount, setReadyCount] = useState(0);
    const [processingCount, setProcessingCount] = useState(0);
    // Services for background processing
    const [aiService, setAiService] = useState(null);
    const [queueManager, setQueueManager] = useState(null);
    const [generationQueue, setGenerationQueue] = useState(null);
    const [refinementQueue, setRefinementQueue] = useState(null);
    const { exit } = useApp();
    // Check for first run on mount
    useEffect(() => {
        if (isFirstRun()) {
            setState('setup');
        }
        else {
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
            }
            catch (err) {
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
                        if (item?.summary)
                            ready++;
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
            }
            catch (err) {
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
    const handleReviewComplete = async (drafts) => {
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
        return (React.createElement(DefaultLayout, null,
            React.createElement(Box, { flexDirection: "column", paddingY: 1 },
                React.createElement(Text, { color: "cyan" }, "Welcome to Claude Inbox Zero"),
                React.createElement(Text, null, "Loading your inbox..."))));
    }
    const handleSetupComplete = async (config) => {
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
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to initialize app');
            setState('error');
        }
    };
    if (state === 'setup') {
        return React.createElement(SetupWizard, { onComplete: handleSetupComplete });
    }
    if (state === 'error') {
        return (React.createElement(DefaultLayout, null,
            React.createElement(Box, { flexDirection: "column", paddingY: 1 },
                React.createElement(Text, { color: "red" },
                    "Error: ",
                    error),
                React.createElement(Text, null, "Press Ctrl+C to exit"))));
    }
    if (state === 'dashboard') {
        return (React.createElement(DefaultLayout, null,
            React.createElement(Dashboard, { inboxService: inboxService, debug: debug, onStartBatch: handleStartBatch, batchOffset: batchOffset, readyCount: readyCount, processingCount: processingCount })));
    }
    if (state === 'complete') {
        const acceptedCount = processedDrafts.filter(d => d.status === 'accepted').length;
        const skippedCount = processedDrafts.filter(d => d.status === 'skipped').length;
        return (React.createElement(DefaultLayout, null,
            React.createElement(Box, { flexDirection: "column", paddingY: 1 },
                React.createElement(Text, { color: "green", bold: true }, "\uD83C\uDF89 Inbox Zero Achieved!"),
                React.createElement(Text, null, "All unread emails have been processed."),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, null,
                        "\u2713 ",
                        acceptedCount,
                        " drafts accepted")),
                React.createElement(Box, null,
                    React.createElement(Text, null,
                        "\u2713 ",
                        skippedCount,
                        " emails skipped")),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "cyan" }, "Press Ctrl+C to exit")))));
    }
    if (state === 'reviewing') {
        return (React.createElement(DefaultLayout, null,
            React.createElement(DraftReview, { emails: emails, inboxService: inboxService, onComplete: handleReviewComplete, onBack: handleBack, debug: debug, preInitializedAiService: aiService, preInitializedQueueManager: queueManager, preInitializedGenerationQueue: generationQueue, preInitializedRefinementQueue: refinementQueue })));
    }
    return null;
};
// Main App component with context providers
const App = (props) => {
    const { debug = false, useImap = false } = props;
    const config = {
        mode: useImap ? 'imap' : 'mock',
        modelName: 'claude-sonnet-4',
        debug,
        resetInbox: props.resetInbox || false,
    };
    return (React.createElement(ConfigProvider, { config: config },
        React.createElement(UIStateProvider, null,
            React.createElement(AppContent, { ...props }))));
};
export default App;
//# sourceMappingURL=app.js.map