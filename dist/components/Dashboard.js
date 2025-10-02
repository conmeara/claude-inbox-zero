import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { ConfigService } from '../services/config.js';
const Dashboard = ({ inboxService, debug = false, onStartBatch, batchOffset, readyCount = 0, processingCount = 0 }) => {
    const [unreadEmails, setUnreadEmails] = useState([]);
    const [currentBatch, setCurrentBatch] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    const [batchNumber, setBatchNumber] = useState(1);
    const [showPrompt, setShowPrompt] = useState(false);
    const [searchText, setSearchText] = useState('');
    const configService = new ConfigService();
    const isReady = readyCount >= 3;
    useEffect(() => {
        const emails = inboxService.getUnreadEmails();
        const batch = inboxService.getEmailBatch(10, batchOffset);
        setUnreadEmails(emails);
        setCurrentBatch(batch);
        setTotalUnread(emails.length);
        setBatchNumber(Math.floor(batchOffset / 10) + 1);
        setShowPrompt(true);
    }, [inboxService, batchOffset]);
    useInput((input, key) => {
        if (showPrompt) {
            if (key.tab && isReady) {
                onStartBatch();
            }
            else if (input.toLowerCase() === 'n') {
                process.exit(0);
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
    return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
        React.createElement(Box, { borderStyle: "round", borderColor: "#CC785C", padding: 1, flexDirection: "column" },
            React.createElement(Box, { marginBottom: 1 },
                React.createElement(Text, { color: "yellow" }, "\u2709\uFE0F  Welcome to Claude Inbox!")),
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
                    " more unread emails)")))),
        showPrompt && (React.createElement(Box, { flexDirection: "column", marginTop: 1 },
            React.createElement(Box, { borderStyle: "round", borderColor: "white", borderDimColor: true, paddingX: 1, flexDirection: "row", alignItems: "center" },
                React.createElement(Text, { color: "gray" },
                    '>',
                    " "),
                React.createElement(TextInput, { value: searchText, onChange: setSearchText, placeholder: isReady ? "Ready to process all emails..." : "Preparing emails..." })),
            React.createElement(Box, { justifyContent: "space-between" },
                React.createElement(Text, { color: isReady ? "white" : "gray", dimColor: !isReady }, isReady ? "Tab to Start" : "Waiting for emails to be ready..."),
                processingCount > 0 && !isReady && (React.createElement(Text, { color: "cyan" },
                    React.createElement(Spinner, { type: "dots" }),
                    " Processing ",
                    readyCount,
                    "/3 emails...")),
                isReady && (React.createElement(Text, { color: "green" },
                    "\u2713 ",
                    readyCount,
                    " emails ready!"))))),
        debug && (React.createElement(Box, { flexDirection: "column", marginTop: 2, paddingTop: 1, borderStyle: "single", borderColor: "gray" },
            React.createElement(Text, { color: "gray" }, "Debug Info:"),
            React.createElement(Text, { color: "gray" },
                "- Total emails: ",
                inboxService.getTotalEmailCount()),
            React.createElement(Text, { color: "gray" },
                "- Unread: ",
                totalUnread),
            React.createElement(Text, { color: "gray" },
                "- Requiring response: ",
                inboxService.getEmailsRequiringResponse().length),
            React.createElement(Text, { color: "gray" },
                "- Current batch size: ",
                currentBatch.length)))));
};
export default Dashboard;
//# sourceMappingURL=Dashboard.js.map