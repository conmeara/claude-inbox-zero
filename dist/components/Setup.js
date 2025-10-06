import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { ConfigService } from '../services/config.js';
import { AIService } from '../services/ai.js';
import { EmailService } from '../services/email-service.js';
const Setup = ({ onComplete }) => {
    const [state, setState] = useState('welcome');
    const [apiKey, setApiKey] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [configService] = useState(() => new ConfigService());
    const [inboxService] = useState(() => new EmailService('mock'));
    const [aiService] = useState(() => new AIService(inboxService));
    const { exit } = useApp();
    useEffect(() => {
        // Check if we already have a working API key
        if (configService.hasApiKey()) {
            testExistingKey();
        }
    }, []);
    const testExistingKey = async () => {
        setState('testing');
        const result = await aiService.testApiKey();
        if (result.success) {
            setState('success');
            setTimeout(() => onComplete(), 2000);
        }
        else {
            setState('welcome');
        }
    };
    useInput((input, key) => {
        if (state === 'welcome') {
            if (input.toLowerCase() === 'y' || key.return) {
                setState('input');
                setShowInput(true);
            }
            else if (input.toLowerCase() === 'n') {
                exit();
            }
            else if (input.toLowerCase() === 's') {
                // Skip setup and use fallback mode
                onComplete();
            }
        }
        else if (state === 'success' || state === 'error') {
            if (key.return) {
                if (state === 'success') {
                    onComplete();
                }
                else {
                    setState('welcome');
                    setApiKey('');
                    setErrorMessage('');
                }
            }
        }
        // Allow Ctrl+C to exit
        if (key.ctrl && input === 'c') {
            exit();
        }
    });
    const handleApiKeySubmit = async (value) => {
        setApiKey(value);
        setShowInput(false);
        setState('testing');
        try {
            // Save the API key
            configService.setApiKey(value);
            // Test the API key
            const result = await aiService.testApiKey();
            if (result.success) {
                setState('success');
                setTimeout(() => onComplete(), 2000);
            }
            else {
                setState('error');
                setErrorMessage(result.message);
                // Clear the invalid API key
                configService.clearApiKey();
            }
        }
        catch (error) {
            setState('error');
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
            configService.clearApiKey();
        }
    };
    if (state === 'welcome') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDD27 Claude Inbox Setup"),
            React.createElement(Text, null),
            React.createElement(Text, null, "Welcome! To get the best experience with AI-powered email processing,"),
            React.createElement(Text, null, "you'll need to configure your Anthropic API key."),
            React.createElement(Text, null),
            React.createElement(Text, { color: "yellow" }, "Would you like to set up your API key now?"),
            React.createElement(Text, null),
            React.createElement(Text, { color: "green" }, "[Y] Yes, configure API key"),
            React.createElement(Text, { color: "blue" }, "[S] Skip setup (use pattern-matching fallbacks)"),
            React.createElement(Text, { color: "red" }, "[N] Exit"),
            React.createElement(Text, null),
            React.createElement(Text, { color: "gray" }, "You can always run \"claude-inbox --setup\" later to configure this.")));
    }
    if (state === 'input') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83D\uDD11 API Key Configuration"),
            React.createElement(Text, null),
            React.createElement(Text, null, "Please enter your Anthropic API key:"),
            React.createElement(Text, { color: "gray" }, "(it starts with \"sk-ant-api03-...\")"),
            React.createElement(Text, null),
            React.createElement(Box, null,
                React.createElement(Text, { color: "cyan" }, "API Key: "),
                showInput && (React.createElement(TextInput, { value: apiKey, onChange: setApiKey, onSubmit: handleApiKeySubmit, placeholder: "sk-ant-api03-...", mask: "*" }))),
            React.createElement(Text, null),
            React.createElement(Text, { color: "gray" }, "Press Enter to save, or Ctrl+C to cancel")));
    }
    if (state === 'testing') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "cyan", bold: true }, "\uD83E\uDDEA Testing API Key"),
            React.createElement(Text, null),
            React.createElement(Text, null, "Testing your API key with Claude..."),
            React.createElement(Text, { color: "gray" }, "This may take a moment...")));
    }
    if (state === 'success') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "green", bold: true }, "\u2705 Setup Complete!"),
            React.createElement(Text, null),
            React.createElement(Text, null, "Your API key is working correctly."),
            React.createElement(Text, null, "You'll now get AI-powered email summaries and drafts!"),
            React.createElement(Text, null),
            React.createElement(Text, { color: "cyan" }, "Run \"node dist/cli.js\" to start processing emails.")));
    }
    if (state === 'error') {
        return (React.createElement(Box, { flexDirection: "column", paddingY: 1 },
            React.createElement(Text, { color: "red", bold: true }, "\u274C Setup Failed"),
            React.createElement(Text, null),
            React.createElement(Text, null,
                "Error: ",
                errorMessage),
            React.createElement(Text, null),
            React.createElement(Text, { color: "yellow" }, "Please check your API key and try again."),
            React.createElement(Text, null),
            React.createElement(Text, { color: "gray" }, "Press Enter to try again, or Ctrl+C to exit")));
    }
    return null;
};
export default Setup;
//# sourceMappingURL=Setup.js.map