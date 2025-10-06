import React from 'react';
import { Box, Text } from 'ink';
import { DescriptiveRadioButtonSelect, type DescriptiveOption } from '../shared/DescriptiveRadioButtonSelect.js';

interface ApiKeySetupProps {
  onSelect: (hasApiKey: boolean) => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onSelect }) => {
  const hasEnvKey = !!process.env.ANTHROPIC_API_KEY;

  const options: DescriptiveOption<boolean>[] = [
    {
      key: 'use-api-key',
      title: 'Use Anthropic API Key',
      description: hasEnvKey
        ? 'Using ANTHROPIC_API_KEY from environment ✓'
        : 'Set ANTHROPIC_API_KEY environment variable and restart',
      value: true,
    },
    {
      key: 'skip-api-key',
      title: 'Continue without API key (Demo mode)',
      description: 'Use pattern-matched fallback responses for demonstration',
      value: false,
    },
  ];

  return (
    <Box
      borderStyle="round"
      borderColor="cyan"
      flexDirection="column"
      paddingY={1}
      paddingX={2}
      width={80}
    >
      <Text bold color="cyan">
        Get started with Claude Inbox Zero
      </Text>
      <Box marginTop={1}>
        <Text>How would you like to authenticate?</Text>
      </Box>
      {!hasEnvKey && (
        <Box marginTop={1} flexDirection="column">
          <Text color="yellow">⚠ No ANTHROPIC_API_KEY environment variable detected</Text>
          <Text color="gray">   To use real AI features, set ANTHROPIC_API_KEY and restart</Text>
        </Box>
      )}
      <Box marginTop={2}>
        <DescriptiveRadioButtonSelect
          options={options}
          onSelect={onSelect}
          initialIndex={hasEnvKey ? 0 : 1}
        />
      </Box>
    </Box>
  );
};
