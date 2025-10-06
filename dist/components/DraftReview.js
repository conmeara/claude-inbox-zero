import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
import { EmailQueueManager } from '../services/email-queue-manager.js';
import { RefinementQueue } from '../services/refinement-queue.js';
import { InitialGenerationQueue } from '../services/initial-generation-queue.js';
const DraftReview = ({ emails, onComplete, onBack, inboxService, debug = false, preInitializedAiService, preInitializedQueueManager, preInitializedGenerationQueue, preInitializedRefinementQueue }) => {
    const [state, setState] = useState('loading');
    const [queueManager] = useState(() => preInitializedQueueManager || new EmailQueueManager(emails));
    const [aiService] = useState(() => preInitializedAiService || new AIService(inboxService));
    const [refinementQueue] = useState(() => preInitializedRefinementQueue || new RefinementQueue(aiService.getSessionManager(), aiService.getAgentClient(), 3));
    const [generationQueue] = useState(() => preInitializedGenerationQueue || new InitialGenerationQueue(aiService, 3));
    const [currentItem, setCurrentItem] = useState(null);
    const [refinementInput, setRefinementInput] = useState('');
    const [manualEditInput, setManualEditInput] = useState('');
    const [error, setError] = useState('');
    const [loadingMessage, setLoadingMessage] = useState('Initializing...');
    const [backgroundStatus, setBackgroundStatus] = useState('');
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
                    }
                    else if (genPending > 0) {
                        setBackgroundStatus(`Processing ${genPending} emails in background...`);
                    }
                    else {
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
                    }
                    else if (genPending > 0) {
                        setBackgroundStatus(`Processing ${genPending} emails in background...`);
                    }
                    else {
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
                    }
                    else if (pending > 0) {
                        setBackgroundStatus(`Processing ${pending} email${pending > 1 ? 's' : ''}...`);
                    }
                    else {
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
                    }
                    else if (pending > 0) {
                        setBackgroundStatus(`Processing ${pending} email${pending > 1 ? 's' : ''}...`);
                    }
                    else {
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
                }
                else {
                    // If using pre-initialized queues, check if we already have ready items
                    let readyCount = 0;
                    for (const email of emails) {
                        const item = queueManager.getItem(email.id);
                        if (item?.summary)
                            readyCount++;
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
            }
            catch (err) {
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
            if (!currentItem)
                return;
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
        }
        else if (state === 'manual-editing' && key.escape) {
            setState('reviewing');
            setManualEditInput('');
        }
    });
    const handleAccept = () => {
        if (!currentItem)
            return;
        queueManager.markAccepted(currentItem.email.id);
        // Finalize session (cleanup memory, keep metrics)
        aiService.getSessionManager().finalizeSession(currentItem.email.id);
        loadNextEmail();
    };
    const handleSkip = () => {
        if (!currentItem)
            return;
        queueManager.markSkipped(currentItem.email.id);
        // Finalize session (cleanup memory, keep metrics)
        aiService.getSessionManager().finalizeSession(currentItem.email.id);
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
        await refinementQueue.enqueue(currentItem.email.id, currentItem.draft.draftContent, feedback, currentItem.email);
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
        if (!currentItem?.draft)
            return;
        setManualEditInput(currentItem.draft.draftContent);
        setState('manual-editing');
    };
    const submitManualEdit = () => {
        if (!currentItem || !currentItem.draft)
            return;
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
    const formatDate = (dateString) => {
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
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" })),
                React.createElement(Text, { color: "cyan" },
                    " ",
                    loadingMessage)),
            backgroundStatus && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "gray" }, backgroundStatus)))));
    }
    // Error state
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "Error: ",
                error),
            React.createElement(Text, null, "Press [B] to go back")));
    }
    // Complete state
    if (state === 'complete') {
        const stats = queueManager.getStats();
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "green", bold: true }, "\u2713 All emails processed!"),
            React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, null,
                    "Total: ",
                    stats.total,
                    " | Accepted: ",
                    stats.accepted,
                    " | Skipped: ",
                    stats.skipped))));
    }
    if (!currentItem) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "gray" }, "Loading next email...")));
    }
    const queueStatus = queueManager.getStatus();
    // Manual edit mode
    if (state === 'manual-editing') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan", bold: true }, "\u270F\uFE0F Edit Draft Manually")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(TextInput, { value: manualEditInput, onChange: setManualEditInput, onSubmit: submitManualEdit, placeholder: "Type your draft..." })),
            React.createElement(Box, { flexDirection: "column" },
                React.createElement(Text, { color: "cyan" }, "Press [Enter] to save, [Escape] to cancel"))));
    }
    // Main review state
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1, flexDirection: "column" },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDCE7 Email Review"),
            (queueStatus.primaryRemaining > 0 || queueStatus.refinedWaiting > 0) && (React.createElement(Text, { color: "gray" },
                queueStatus.primaryRemaining > 0 ? `${queueStatus.primaryRemaining} unprocessed` : '',
                queueStatus.refinedWaiting > 0 ? ` | ${queueStatus.refinedWaiting} refined ready` : ''))),
        currentItem.state === 'refined' && (React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "green" }, "\u2713 This draft was refined based on your feedback!"),
            currentItem.refinementFeedback && (React.createElement(Text, { color: "gray" },
                " (You asked: \"",
                currentItem.refinementFeedback,
                "\")")))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "From: "),
                React.createElement(Text, { color: "green", bold: true }, currentItem.email.from.name)),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "Subject: "),
                React.createElement(Text, { color: "white" },
                    "\"",
                    currentItem.email.subject,
                    "\"")),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "Date: "),
                React.createElement(Text, { color: "gray" }, formatDate(currentItem.email.date)))),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "yellow" }, "\uD83D\uDCA1 Summary:"),
            React.createElement(Box, { marginLeft: 2 }, currentItem.summary ? (React.createElement(Text, { color: "white" }, currentItem.summary)) : (React.createElement(Text, { color: "gray" },
                React.createElement(Spinner, { type: "dots" }),
                " Generating summary...")))),
        currentItem.draft ? (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow", bold: true }, "\uD83D\uDCDD Draft Reply:"),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
                React.createElement(Box, { marginLeft: 2, marginY: 1 },
                    React.createElement(Text, { color: "white" }, currentItem.draft.draftContent)),
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Box, null,
                    React.createElement(Text, { color: "cyan" }, "> "),
                    React.createElement(TextInput, { value: refinementInput, onChange: setRefinementInput, onSubmit: submitRefinement, placeholder: "Ask AI to do anything (e.g. make it longer, add urgency, change tone)" })),
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray", dimColor: true }, "[Tab] Accept  [\u21E7Tab] Skip  [\u2318\u2190\u2192] Navigate  [^E] Manual Edit  [Esc] Clear")),
                (currentItem.refinementCount ?? 0) > 0 && (React.createElement(Text, { color: "gray" },
                    "(Refined ",
                    currentItem.refinementCount,
                    "x)"))))) : currentItem.email.requiresResponse ? (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "yellow", bold: true }, "\uD83D\uDCDD Draft Reply:"),
                React.createElement(Box, { marginLeft: 2, marginY: 1 },
                    React.createElement(Text, { color: "gray" },
                        React.createElement(Spinner, { type: "dots" }),
                        " Generating draft reply..."))),
            React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "[Tab] Accept  [\u21E7Tab] Skip  [\u2318\u2190\u2192] Navigate"),
                React.createElement(Text, { color: "gray", dimColor: true }, "(Draft will be ready shortly)")))) : (React.createElement(React.Fragment, null,
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "blue" }, "\u2139\uFE0F  This email is informational only - no response needed.")),
            React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                React.createElement(Text, { color: "gray", dimColor: true }, "[Tab] Accept  [\u21E7Tab] Skip  [\u2318\u2190\u2192] Navigate")))),
        React.createElement(Box, { marginTop: 1, justifyContent: "space-between" },
            React.createElement(Text, { color: "gray" },
                "Progress: ",
                queueStatus.completed,
                "/",
                queueStatus.completed + queueStatus.primaryRemaining + queueStatus.refinedWaiting + queueStatus.refining,
                " emails"),
            backgroundStatus && (React.createElement(Text, { color: "cyan" },
                React.createElement(Spinner, { type: "dots" }),
                " ",
                backgroundStatus))),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Current state: ",
                currentItem.state),
            React.createElement(Text, { color: "gray" },
                "- Queue status: ",
                JSON.stringify(queueStatus)),
            React.createElement(Text, { color: "gray" },
                "- Refinement count: ",
                currentItem.refinementCount || 0)))));
};
export default DraftReview;
//# sourceMappingURL=DraftReview.js.map