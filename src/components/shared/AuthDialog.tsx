import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

type AuthType = 'api-key' | 'none';

interface AuthDialogProps {
  onAuthSelect: (authType: AuthType) => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ onAuthSelect }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string>('');

  const options = [
    { label: 'Use Anthropic API Key (ANTHROPIC_API_KEY env var)', value: 'api-key' as AuthType },
    { label: 'Continue without API key (use fallback responses)', value: 'none' as AuthType },
  ];

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      const selected = options[selectedIndex];
      if (selected.value === 'api-key' && !process.env.ANTHROPIC_API_KEY) {
        setError('ANTHROPIC_API_KEY environment variable not set');
        return;
      }
      onAuthSelect(selected.value);
    }
  });

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      flexDirection="column"
      padding={1}
      width={80}
    >
      <Text bold color="cyan">
        Get started with Claude Inbox
      </Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate?</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        {options.map((option, index) => (
          <Box key={option.value} marginY={0}>
            <Text color={index === selectedIndex ? 'green' : 'white'}>
              {index === selectedIndex ? '● ' : '○ '}
              {option.label}
            </Text>
          </Box>
        ))}
      </Box>
      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">(Use ↑↓ arrows to navigate, Enter to select)</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="cyan">
          To set your API key: export ANTHROPIC_API_KEY="your-key-here"
        </Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">
          Get your API key from: https://console.anthropic.com/settings/keys
        </Text>
      </Box>
    </Box>
  );
};
