import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
import { ConfigService } from '../services/config.js';
// Animated dot component like Claude Code
const AnimatedDot = ({ status }) => {
    const [dotIndex, setDotIndex] = useState(0);
    const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    useEffect(() => {
        if (status === 'processing') {
            const interval = setInterval(() => {
                setDotIndex((prev) => (prev + 1) % dots.length);
            }, 80);
            return () => clearInterval(interval);
        }
    }, [status, dots.length]);
    if (status === 'processing') {
        return React.createElement(Text, { color: "white" },
            dots[dotIndex],
            " ");
    }
    else if (status === 'success') {
        return React.createElement(Text, { color: "green" }, "\u25CF ");
    }
    else if (status === 'error') {
        return React.createElement(Text, { color: "red" }, "\u25CF ");
    }
    else {
        return React.createElement(Text, { color: "white" }, "\u25CF ");
    }
};
const StreamingInterface = ({ inboxService, debug = false, onComplete, onBack }) => {
    const [state, setState] = useState('dashboard');
    const [dashboardVisible, setDashboardVisible] = useState(true);
    const [processedEmails, setProcessedEmails] = useState([]);
    const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
    const [processingIndex, setProcessingIndex] = useState(0);
    const [allEmails, setAllEmails] = useState([]);
    const [allDrafts, setAllDrafts] = useState([]);
    // Chat and input state
    const [inputText, setInputText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [isEditingMode, setIsEditingMode] = useState(false);
    const [editingText, setEditingText] = useState('');
    const [processingStatus, setProcessingStatus] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isStatusComplete, setIsStatusComplete] = useState(false);
    // Services
    const [aiService] = useState(() => new AIService(inboxService));
    const [configService] = useState(() => new ConfigService());
    // Dashboard data
    const [unreadEmails, setUnreadEmails] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    useEffect(() => {
        // Initialize dashboard data
        const emails = inboxService.getUnreadEmails();
        const batch = inboxService.getEmailBatch(10, 0);
        setUnreadEmails(emails);
        setCurrentBatch(batch);
        setTotalUnread(emails.length);
        setAllEmails(emails);
    }, [inboxService]);
    useEffect(() => {
        if (state === 'streaming' && processingIndex < allEmails.length) {
            processNextEmail();
        }
    }, [state, processingIndex]);
    const processNextEmail = async () => {
        if (processingIndex >= allEmails.length)
            return;
        const emailToProcess = allEmails[processingIndex];
        // Add email in processing state
        const processingEmail = {
            email: emailToProcess,
            summary: '',
            status: 'processing'
        };
        setProcessedEmails(prev => [...prev, processingEmail]);
        try {
            // Initialize AI service if needed
            await aiService.initialize();
            // Generate summary
            const summary = await aiService.summarizeEmail(emailToProcess);
            // Generate draft if needed
            let draft;
            if (emailToProcess.requiresResponse) {
                const draftContent = await aiService.generateEmailDraft(emailToProcess);
                draft = {
                    emailId: emailToProcess.id,
                    draftContent,
                    status: 'pending'
                };
                setAllDrafts(prev => [...prev, draft]);
            }
            // Update email to ready state
            setProcessedEmails(prev => prev.map((pe, index) => index === processingIndex
                ? { ...pe, summary, draft, status: 'ready' }
                : pe));
            // Move to next email
            setProcessingIndex(prev => prev + 1);
        }
        catch (error) {
            console.error(`Failed to process email ${emailToProcess.id}:`, error);
            // Mark as ready with error state
            setProcessedEmails(prev => prev.map((pe, index) => index === processingIndex
                ? { ...pe, summary: 'Error processing email', status: 'ready' }
                : pe));
            setProcessingIndex(prev => prev + 1);
        }
    };
    const handleStartStreaming = async () => {
        setState('streaming');
        // Keep dashboard visible in streaming mode
        setProcessingIndex(0);
        // Initialize AI service
        try {
            await aiService.initialize();
        }
        catch (error) {
            console.error('Failed to initialize AI service:', error);
        }
    };
    const handleAcceptDraft = () => {
        const currentEmail = processedEmails[currentEmailIndex];
        if (currentEmail?.draft) {
            // Update draft status
            const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                ? { ...d, status: 'accepted' }
                : d);
            setAllDrafts(updatedDrafts);
            // Update processed email status
            setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                ? { ...pe, status: 'accepted' }
                : pe));
            moveToNextEmail();
        }
    };
    const handleSkipEmail = () => {
        const currentEmail = processedEmails[currentEmailIndex];
        if (currentEmail) {
            if (currentEmail.draft) {
                const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                    ? { ...d, status: 'skipped' }
                    : d);
                setAllDrafts(updatedDrafts);
            }
            setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                ? { ...pe, status: 'skipped' }
                : pe));
            moveToNextEmail();
        }
    };
    const moveToNextEmail = () => {
        if (currentEmailIndex < processedEmails.length - 1) {
            setCurrentEmailIndex(prev => prev + 1);
        }
        else if (currentEmailIndex === allEmails.length - 1) {
            // All emails processed
            onComplete(allDrafts);
        }
    };
    const handleChatSubmit = async () => {
        if (!inputText.trim())
            return;
        console.log('handleChatSubmit called with:', inputText);
        // Add user message
        const userMessage = {
            id: Date.now().toString(),
            text: inputText,
            isUser: true,
            timestamp: new Date()
        };
        setChatMessages(prev => [...prev, userMessage]);
        // Handle AI improvement requests
        const currentEmail = processedEmails[currentEmailIndex];
        console.log('Current email:', currentEmail);
        console.log('Has draft:', !!currentEmail?.draft);
        if (currentEmail?.draft) {
            // Any message with a current draft is treated as an AI improvement request
            const feedback = inputText.toLowerCase().startsWith('ai:')
                ? inputText.substring(3).trim()
                : inputText;
            try {
                setIsProcessing(true);
                const improvedDraft = await aiService.improveEmailDraft(currentEmail.draft.editedContent || currentEmail.draft.draftContent, feedback, currentEmail.email, (status) => {
                    setProcessingStatus(status);
                    setIsStatusComplete(status.includes('successfully') || status.includes('complete'));
                });
                // Update the draft
                const updatedDrafts = allDrafts.map(d => d.emailId === currentEmail.draft.emailId
                    ? { ...d, editedContent: improvedDraft }
                    : d);
                setAllDrafts(updatedDrafts);
                setProcessedEmails(prev => prev.map((pe, index) => index === currentEmailIndex
                    ? { ...pe, draft: { ...pe.draft, editedContent: improvedDraft } }
                    : pe));
                // Show completion with green bullet
                setTimeout(() => {
                    setProcessingStatus('');
                    setIsStatusComplete(false);
                }, 1500);
            }
            catch (error) {
                setProcessingStatus('Failed to improve draft. Please try again.');
                setIsStatusComplete(false);
                setTimeout(() => {
                    setProcessingStatus('');
                }, 2000);
            }
            finally {
                setIsProcessing(false);
            }
        }
        setInputText('');
    };
    useInput((input, key) => {
        // Don't interfere with text input when user is typing
        if (state === 'dashboard') {
            if (key.tab) {
                handleStartStreaming();
            }
            else if (key.escape) {
                process.exit(0);
            }
        }
        else if (state === 'streaming' && !isEditingMode && !isProcessing) {
            if (key.tab) {
                handleAcceptDraft();
            }
            else if (key.rightArrow) {
                handleSkipEmail();
            }
            else if (key.downArrow) {
                const currentEmail = processedEmails[currentEmailIndex];
                if (currentEmail?.draft) {
                    setEditingText(currentEmail.draft.editedContent || currentEmail.draft.draftContent);
                    setIsEditingMode(true);
                }
            }
            else if (key.escape) {
                onBack();
            }
        }
    });
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };
    const truncateSubject = (subject, maxLength = 60) => {
        return subject.length > maxLength ? subject.substring(0, maxLength) + '...' : subject;
    };
    const renderDashboard = () => (React.createElement(Box, { borderStyle: "round", borderColor: "#CC785C", padding: 1, flexDirection: "column" },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "yellow" }, "Welcome to Claude Inbox!")),
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, null,
                "Unread Emails: ",
                React.createElement(Text, { bold: true, color: "yellow" }, totalUnread)),
            React.createElement(Text, { color: "gray" }, " \u2022 AI Mode: "),
            React.createElement(Text, { color: configService.hasApiKey() ? "green" : "yellow" }, configService.hasApiKey() ? "Claude API" : "Pattern Matching")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "cyan" },
                "First ",
                Math.min(currentBatch.length, 10),
                " unread emails:"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            currentBatch.slice(0, 10).map((email, index) => (React.createElement(Box, { key: email.id, marginLeft: 2 },
                React.createElement(Text, { color: "white" },
                    (index + 1).toString().padStart(2, ' '),
                    "."),
                React.createElement(Text, { bold: true },
                    "\"",
                    truncateSubject(email.subject),
                    "\""),
                React.createElement(Text, { color: "gray" }, " - from "),
                React.createElement(Text, { color: "green" }, email.from.name),
                React.createElement(Text, { color: "gray" }, ", "),
                React.createElement(Text, { color: "gray" }, formatDate(email.date)))))),
        totalUnread > 10 && (React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "gray" },
                "(",
                totalUnread - 10,
                " more unread emails)")))));
    const renderEmailCard = (processedEmail, index, isLast = false) => {
        const { email, summary, draft, status } = processedEmail;
        const isActive = index === currentEmailIndex;
        // For non-active emails, render normally
        if (!isActive) {
            return (React.createElement(Box, { key: email.id, flexDirection: "column", marginBottom: 1, borderStyle: "single", borderColor: "gray", padding: 1 },
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(AnimatedDot, { status: status === 'processing'
                            ? 'processing'
                            : status === 'accepted'
                                ? 'success'
                                : status === 'skipped'
                                    ? 'default'
                                    : 'default' }),
                    React.createElement(Text, { bold: true },
                        "Email ",
                        index + 1,
                        " of ",
                        allEmails.length),
                    status === 'processing' && (React.createElement(Text, { color: "gray" },
                        ' ',
                        React.createElement(Spinner, { type: "dots" }),
                        " Processing..."))),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, "\u251C\u2500\u2500 "),
                    React.createElement(Text, null, email.from.name)),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, "\u251C\u2500\u2500 "),
                    React.createElement(Text, { color: "gray" }, email.subject)),
                React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, summary ? "├── " : "└── "),
                    React.createElement(Text, { color: "gray", dimColor: true }, formatDate(email.date))),
                summary && (React.createElement(Box, null,
                    React.createElement(Text, { color: "gray" }, "\u2514\u2500\u2500 "),
                    React.createElement(Text, null,
                        "Summary: ",
                        summary))),
                status === 'accepted' && (React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "green" }, "Draft accepted"))),
                status === 'skipped' && (React.createElement(Box, { marginTop: 1 },
                    React.createElement(Text, { color: "gray" }, "Skipped")))));
        }
        // For active email, we'll render it differently (merged with input)
        // This will be handled in the main render
        return null;
    };
    const renderActiveEmailCard = () => {
        const processedEmail = processedEmails[currentEmailIndex];
        if (!processedEmail)
            return null;
        const { email, summary, draft, status } = processedEmail;
        return (React.createElement(Box, { flexDirection: "column", marginBottom: 1, borderStyle: "round", borderColor: "#CC785C", padding: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(AnimatedDot, { status: status === 'processing'
                        ? 'processing'
                        : status === 'accepted'
                            ? 'success'
                            : status === 'skipped'
                                ? 'default'
                                : 'default' }),
                React.createElement(Text, { bold: true },
                    "Email ",
                    currentEmailIndex + 1,
                    " of ",
                    allEmails.length),
                status === 'processing' && (React.createElement(Text, { color: "gray" },
                    ' ',
                    React.createElement(Spinner, { type: "dots" }),
                    " Processing..."))),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "\u251C\u2500\u2500 "),
                React.createElement(Text, null, email.from.name)),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "\u251C\u2500\u2500 "),
                React.createElement(Text, null, email.subject)),
            React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, summary ? "├── " : "└── "),
                React.createElement(Text, { color: "gray", dimColor: true }, formatDate(email.date))),
            summary && (React.createElement(Box, null,
                React.createElement(Text, { color: "gray" }, "\u2514\u2500\u2500 "),
                React.createElement(Text, null,
                    "Summary: ",
                    summary))),
            draft && (React.createElement(React.Fragment, null,
                React.createElement(Box, { marginTop: 1 },
                    React.createElement(AnimatedDot, { status: "default" }),
                    React.createElement(Text, null, "Draft Reply:")),
                React.createElement(Box, { marginLeft: 2, marginBottom: 1 },
                    React.createElement(Text, { color: "white" }, draft.editedContent || draft.draftContent)))),
            processingStatus && (React.createElement(Box, { marginBottom: 1 },
                React.createElement(AnimatedDot, { status: processingStatus.includes('Failed') || processingStatus.includes('Error')
                        ? 'error'
                        : isStatusComplete
                            ? 'success'
                            : 'processing' }),
                React.createElement(Text, { color: "gray", dimColor: true }, processingStatus))),
            chatMessages.length > 0 && (React.createElement(Box, { flexDirection: "column", marginTop: 1, marginBottom: 1 }, chatMessages.slice(-3).map((message, idx) => (React.createElement(Box, { key: message.id, marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, idx === chatMessages.slice(-3).length - 1 ? "└── " : "├── "),
                React.createElement(Text, { color: message.isUser ? "cyan" : "white" },
                    message.isUser ? "You: " : "",
                    message.text)))))),
            React.createElement(Box, { marginTop: 1, marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500")),
            React.createElement(Box, { flexDirection: "row", alignItems: "center" },
                React.createElement(Text, { color: "gray" },
                    '>',
                    " "),
                React.createElement(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleChatSubmit, placeholder: "Chat with Claude or use controls..." }))));
    };
    const renderChatMessages = () => (React.createElement(Box, { flexDirection: "column", marginBottom: 1 }, chatMessages.slice(-3).map(message => (React.createElement(Box, { key: message.id, marginLeft: message.isUser ? 2 : 0 },
        React.createElement(Text, { color: message.isUser ? "cyan" : "green" },
            message.isUser ? "You: " : "Claude: ",
            message.text))))));
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        dashboardVisible && renderDashboard(),
        state === 'streaming' && (React.createElement(Box, { flexDirection: "column" },
            processedEmails
                .filter((_, index) => index < currentEmailIndex)
                .map((processedEmail, index) => renderEmailCard(processedEmail, index)),
            processedEmails[currentEmailIndex] && renderActiveEmailCard(),
            processedEmails[currentEmailIndex] && (React.createElement(Box, { marginTop: 1 },
                React.createElement(Text, { color: "white", dimColor: true }, "Tab: Accept \u2022 \u2192: Skip \u2022 \u2193: Edit \u2022 Esc: Back"))))),
        state === 'dashboard' && (React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "white", borderDimColor: true, paddingX: 1, flexDirection: "row", alignItems: "center" },
                React.createElement(Text, { color: "gray" },
                    '>',
                    " "),
                React.createElement(TextInput, { value: inputText, onChange: setInputText, onSubmit: handleChatSubmit, placeholder: "Ready to process all emails..." })),
            React.createElement(Text, { color: "white", dimColor: true }, "Tab to Start \u2022 Esc to Exit"))),
        debug && state === 'streaming' && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Processed emails: ",
                processedEmails.length,
                "/",
                allEmails.length),
            React.createElement(Text, { color: "gray" },
                "- Current email index: ",
                currentEmailIndex),
            React.createElement(Text, { color: "gray" },
                "- Processing index: ",
                processingIndex),
            React.createElement(Text, { color: "gray" },
                "- Total drafts: ",
                allDrafts.length)))));
};
export default StreamingInterface;
//# sourceMappingURL=StreamingInterface.js.map