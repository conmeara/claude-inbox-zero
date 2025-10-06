import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { ConfigService } from '../services/config.js';
import { AIService } from '../services/ai.js';
import { EmailService } from '../services/email-service.js';

interface SetupProps {
  onComplete: () => void;
}

type SetupState = 'welcome' | 'input' | 'testing' | 'success' | 'error';

const Setup: React.FC<SetupProps> = ({ onComplete }) => {
  const [state, setState] = useState<SetupState>('welcome');
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
    } else {
      setState('welcome');
    }
  };

  useInput((input, key) => {
    if (state === 'welcome') {
      if (input.toLowerCase() === 'y' || key.return) {
        setState('input');
        setShowInput(true);
      } else if (input.toLowerCase() === 'n') {
        exit();
      } else if (input.toLowerCase() === 's') {
        // Skip setup and use fallback mode
        onComplete();
      }
    } else if (state === 'success' || state === 'error') {
      if (key.return) {
        if (state === 'success') {
          onComplete();
        } else {
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

  const handleApiKeySubmit = async (value: string) => {
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
      } else {
        setState('error');
        setErrorMessage(result.message);
        // Clear the invalid API key
        configService.clearApiKey();
      }
    } catch (error) {
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred');
      configService.clearApiKey();
    }
  };

  if (state === 'welcome') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan" bold>🔧 Claude Inbox Setup</Text>
        <Text></Text>
        <Text>Welcome! To get the best experience with AI-powered email processing,</Text>
        <Text>you'll need to configure your Anthropic API key.</Text>
        <Text></Text>
        <Text color="yellow">Would you like to set up your API key now?</Text>
        <Text></Text>
        <Text color="green">[Y] Yes, configure API key</Text>
        <Text color="blue">[S] Skip setup (use pattern-matching fallbacks)</Text>
        <Text color="red">[N] Exit</Text>
        <Text></Text>
        <Text color="gray">You can always run "claude-inbox --setup" later to configure this.</Text>
      </Box>
    );
  }

  if (state === 'input') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan" bold>🔑 API Key Configuration</Text>
        <Text></Text>
        <Text>Please enter your Anthropic API key:</Text>
        <Text color="gray">(it starts with "sk-ant-api03-...")</Text>
        <Text></Text>
        <Box>
          <Text color="cyan">API Key: </Text>
          {showInput && (
            <TextInput
              value={apiKey}
              onChange={setApiKey}
              onSubmit={handleApiKeySubmit}
              placeholder="sk-ant-api03-..."
              mask="*"
            />
          )}
        </Box>
        <Text></Text>
        <Text color="gray">Press Enter to save, or Ctrl+C to cancel</Text>
      </Box>
    );
  }

  if (state === 'testing') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="cyan" bold>🧪 Testing API Key</Text>
        <Text></Text>
        <Text>Testing your API key with Claude...</Text>
        <Text color="gray">This may take a moment...</Text>
      </Box>
    );
  }

  if (state === 'success') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="green" bold>✅ Setup Complete!</Text>
        <Text></Text>
        <Text>Your API key is working correctly.</Text>
        <Text>You'll now get AI-powered email summaries and drafts!</Text>
        <Text></Text>
        <Text color="cyan">Run "node dist/cli.js" to start processing emails.</Text>
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red" bold>❌ Setup Failed</Text>
        <Text></Text>
        <Text>Error: {errorMessage}</Text>
        <Text></Text>
        <Text color="yellow">Please check your API key and try again.</Text>
        <Text></Text>
        <Text color="gray">Press Enter to try again, or Ctrl+C to exit</Text>
      </Box>
    );
  }

  return null;
};

export default Setup;