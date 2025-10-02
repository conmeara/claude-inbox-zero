import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
const SendConfirm = ({ emails, drafts, inboxService, onComplete, onBack, debug = false }) => {
    const [state, setState] = useState('confirming');
    const [sentCount, setSentCount] = useState(0);
    const [error, setError] = useState('');
    const acceptedDrafts = drafts.filter(draft => draft.status === 'accepted' || draft.status === 'edited');
    const emailsToMarkRead = emails.map(email => email.id);
    const informationalEmails = emails.filter(email => !email.requiresResponse);
    useInput((input, key) => {
        if (state === 'confirming') {
            if (input.toLowerCase() === 'y' || key.return) {
                startSending();
            }
            else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'b') {
                onBack();
            }
        }
        else if (state === 'complete' || state === 'error') {
            if (key.return || input.toLowerCase() === 'c') {
                onComplete();
            }
        }
    });
    const startSending = async () => {
        setState('sending');
        try {
            // Simulate sending emails (in real app, this would use Gmail API)
            for (let i = 0; i < acceptedDrafts.length; i++) {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 500));
                setSentCount(i + 1);
            }
            // Mark all emails in the batch as read
            await inboxService.markEmailsAsRead(emailsToMarkRead);
            setState('complete');
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to send emails');
            setState('error');
        }
    };
    const getEmailById = (id) => {
        return emails.find(email => email.id === id);
    };
    const getDraftContent = (draft) => {
        return draft.status === 'edited' && draft.editedContent
            ? draft.editedContent
            : draft.draftContent;
    };
    if (state === 'sending') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" })),
                React.createElement(Text, { color: "cyan" }, " Sending emails and marking as read...")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, null,
                    "Progress: ",
                    sentCount,
                    "/",
                    acceptedDrafts.length,
                    " replies sent")),
            acceptedDrafts.map((draft, index) => {
                const email = getEmailById(draft.emailId);
                const isSent = index < sentCount;
                const isCurrent = index === sentCount;
                return (React.createElement(Box, { key: draft.emailId, marginLeft: 2 },
                    React.createElement(Text, { color: isSent ? "green" : isCurrent ? "yellow" : "gray" }, isSent ? "✅" : isCurrent ? "📤" : "⏳"),
                    React.createElement(Text, { color: "gray" }, " Replying to "),
                    React.createElement(Text, { color: "white" }, email?.from.name),
                    React.createElement(Text, { color: "gray" },
                        " - \"",
                        email?.subject,
                        "\"")));
            })));
    }
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red" },
                "\u274C Error: ",
                error),
            React.createElement(Text, null, "Some emails may have been sent successfully."),
            React.createElement(Text, { color: "cyan" }, "Press [Enter] to continue")));
    }
    if (state === 'complete') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "green", bold: true }, "\uD83C\uDF89 Batch Complete!")),
            React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
                React.createElement(Text, { color: "green" },
                    "\u2705 ",
                    acceptedDrafts.length,
                    " replies sent successfully"),
                React.createElement(Text, { color: "blue" },
                    "\uD83D\uDCE7 ",
                    informationalEmails.length,
                    " informational emails marked as read"),
                React.createElement(Text, { color: "cyan" },
                    "\uD83D\uDCE5 ",
                    emails.length,
                    " total emails processed")),
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "gray" }, "All emails in this batch have been processed and marked as read.")),
            React.createElement(Text, { color: "cyan" }, "Press [Enter] to continue or [C] to see next batch")));
    }
    // Confirming state
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { marginBottom: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDCE4 Send Confirmation")),
        React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, null, "Ready to process this batch:"),
            React.createElement(Box, { marginLeft: 2, marginTop: 1 },
                React.createElement(Text, { color: "green" },
                    "\u2709\uFE0F  ",
                    acceptedDrafts.length,
                    " replies will be sent")),
            React.createElement(Box, { marginLeft: 2 },
                React.createElement(Text, { color: "blue" },
                    "\uD83D\uDCE7 ",
                    informationalEmails.length,
                    " informational emails will be marked read")),
            React.createElement(Box, { marginLeft: 2 },
                React.createElement(Text, { color: "yellow" },
                    "\u23ED\uFE0F  ",
                    drafts.filter(d => d.status === 'skipped').length,
                    " emails skipped (remain unread)"))),
        acceptedDrafts.length > 0 && (React.createElement(Box, { flexDirection: "column", marginBottom: 1 },
            React.createElement(Text, { color: "yellow" }, "Replies to send:"),
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            acceptedDrafts.map((draft, index) => {
                const email = getEmailById(draft.emailId);
                const content = getDraftContent(draft);
                const isEdited = draft.status === 'edited';
                return (React.createElement(Box, { key: draft.emailId, flexDirection: "column", marginBottom: 1 },
                    React.createElement(Box, null,
                        React.createElement(Text, { color: "white" },
                            (index + 1).toString().padStart(2, ' '),
                            "."),
                        React.createElement(Text, { color: "gray" }, " To: "),
                        React.createElement(Text, { color: "green" }, email?.from.name),
                        React.createElement(Text, { color: "gray" },
                            " - \"",
                            email?.subject,
                            "\""),
                        isEdited && React.createElement(Text, { color: "yellow" }, " [EDITED]")),
                    React.createElement(Box, { marginLeft: 4 },
                        React.createElement(Text, { color: "gray" },
                            "\"",
                            content.substring(0, 80),
                            content.length > 80 ? '...' : '',
                            "\""))));
            }))),
        React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Text, { color: "gray" }, "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"),
            React.createElement(Text, { color: "red", bold: true }, "\u26A0\uFE0F  This will send real emails and mark messages as read!"),
            React.createElement(Text, null,
                "Send ",
                acceptedDrafts.length,
                " replies and mark ",
                emails.length,
                " emails as read?"),
            React.createElement(Text, { color: "cyan" }, "Press [Y] to send, [N] to go back")),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Total drafts: ",
                drafts.length),
            React.createElement(Text, { color: "gray" },
                "- Accepted: ",
                drafts.filter(d => d.status === 'accepted').length),
            React.createElement(Text, { color: "gray" },
                "- Edited: ",
                drafts.filter(d => d.status === 'edited').length),
            React.createElement(Text, { color: "gray" },
                "- Skipped: ",
                drafts.filter(d => d.status === 'skipped').length),
            React.createElement(Text, { color: "gray" },
                "- Emails to mark read: ",
                emailsToMarkRead.length)))));
};
export default SendConfirm;
//# sourceMappingURL=SendConfirm.js.map