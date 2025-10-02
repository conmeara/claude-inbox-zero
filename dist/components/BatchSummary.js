import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { AIService } from '../services/ai.js';
const BatchSummary = ({ emails, onContinue, onBack, debug = false }) => {
    const [summaries, setSummaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showPrompt, setShowPrompt] = useState(false);
    const [progressMessage, setProgressMessage] = useState('Initializing AI assistant...');
    const [aiService] = useState(() => new AIService());
    useEffect(() => {
        async function generateSummaries() {
            try {
                setLoading(true);
                // Initialize AI service with user's writing style
                setProgressMessage('Loading personalized settings...');
                await aiService.initialize();
                // Set progress callback
                aiService.setProgressCallback((message) => {
                    setProgressMessage(message);
                });
                // Generate summaries with progress updates
                const emailSummaries = await aiService.summarizeEmailBatch(emails);
                setSummaries(emailSummaries);
                setShowPrompt(true);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate summaries');
            }
            finally {
                setLoading(false);
            }
        }
        generateSummaries();
    }, [emails, aiService]);
    useInput((input, key) => {
        if (showPrompt && !loading) {
            if (input.toLowerCase() === 'y' || key.return) {
                onContinue();
            }
            else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'b') {
                onBack();
            }
        }
    });
    const getEmailById = (id) => {
        return emails.find(email => email.id === id);
    };
    const getSummaryForEmail = (emailId) => {
        const summary = summaries.find(s => s.emailId === emailId);
        return summary?.summary || 'Summary not available';
    };
    if (loading) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" })),
                React.createElement(Text, { color: "cyan" },
                    " ",
                    progressMessage)),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "gray" },
                    "Processing ",
                    emails.length,
                    " emails in batch mode for faster results...")),
            aiService.hasApiKey() ? (React.createElement(Text, { color: "green" }, "\u2713 Using Claude API for intelligent summarization")) : (React.createElement(Text, { color: "yellow" }, "\u26A0 No API key found - using fallback patterns"))));
    }
    if (error) {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "Error: ",
                error),
            React.createElement(Text, null, "Press [B] to go back")));
    }
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true },
                "\uD83D\uDCCA Batch Summary (",
                emails.length,
                " emails)")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "cyan" }, "AI-Generated Summaries:"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            emails.map((email, index) => {
                const summary = getSummaryForEmail(email.id);
                return (React.createElement(Box, { key: email.id, flexDirection: "column", marginBottom: 1 },
                    React.createElement(Box, null,
                        React.createElement(Text, { color: "white" },
                            (index + 1).toString().padStart(2, ' '),
                            "."),
                        React.createElement(Text, { color: "gray" }, " ["),
                        React.createElement(Text, { color: email.requiresResponse ? "yellow" : "blue" }, email.requiresResponse ? "Needs Reply" : "Info Only"),
                        React.createElement(Text, { color: "gray" }, "] "),
                        React.createElement(Text, { bold: true, color: "green" }, email.from.name),
                        React.createElement(Text, { color: "gray" }, " - "),
                        React.createElement(Text, { color: "white" },
                            "\"",
                            email.subject,
                            "\"")),
                    React.createElement(Box, { marginLeft: 4 },
                        React.createElement(Text, { color: "yellow" },
                            "\uD83D\uDCA1 ",
                            summary))));
            })),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            React.createElement(Text, null,
                React.createElement(Text, { color: "yellow" }, emails.filter(e => e.requiresResponse).length),
                React.createElement(Text, null, " emails need replies, "),
                React.createElement(Text, { color: "blue" }, emails.filter(e => !e.requiresResponse).length),
                React.createElement(Text, null, " are informational only"))),
        showPrompt && (React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            React.createElement(Text, null, "Continue to draft replies for emails that need responses?"),
            React.createElement(Text, { color: "cyan" }, "Press [Y] to continue, [B] to go back"))),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Summaries generated: ",
                summaries.length),
            React.createElement(Text, { color: "gray" },
                "- Emails requiring response: ",
                emails.filter(e => e.requiresResponse).length),
            React.createElement(Text, { color: "gray" },
                "- Total processing time: ~",
                summaries.length * 2,
                "s")))));
};
export default BatchSummary;
//# sourceMappingURL=BatchSummary.js.map