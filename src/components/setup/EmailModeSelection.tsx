import React from 'react';
import { Box, Text } from 'ink';
import { DescriptiveRadioButtonSelect, type DescriptiveOption } from '../shared/DescriptiveRadioButtonSelect.js';

type EmailMode = 'mock' | 'imap';

interface EmailModeSelectionProps {
  onSelect: (mode: EmailMode) => void;
}

export const EmailModeSelection: React.FC<EmailModeSelectionProps> = ({ onSelect }) => {
  const options: DescriptiveOption<EmailMode>[] = [
    {
      key: 'mock',
      title: 'Mock Data (Demo)',
      description: '25 sample emails for testing and demonstration',
      value: 'mock',
    },
    {
      key: 'imap',
      title: 'IMAP Email Account',
      description: 'Connect to Gmail, Outlook, Yahoo, or any IMAP provider',
      value: 'imap',
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
        Email Source
      </Text>
      <Box marginTop={1}>
        <Text>Where should Claude Inbox get your emails from?</Text>
      </Box>
      <Box marginTop={2}>
        <DescriptiveRadioButtonSelect
          options={options}
          onSelect={onSelect}
          initialIndex={0}
        />
      </Box>
      <Box marginTop={2}>
        <Text color="gray">Note: You can change this later in settings</Text>
      </Box>
    </Box>
  );
};
