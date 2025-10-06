import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getCommandSuggestions, type SlashCommand } from '../../utils/slash-commands.js';

interface InputPromptProps {
  placeholder?: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
}

export const InputPrompt: React.FC<InputPromptProps> = ({
  placeholder = 'Type your message or /help for commands',
  onSubmit,
  disabled = false
}) => {
  const [value, setValue] = useState('');
  const [suggestions, setSuggestions] = useState<SlashCommand[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);

  useEffect(() => {
    if (value.startsWith('/')) {
      const sug = getCommandSuggestions(value);
      setSuggestions(sug);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  useInput((input, key) => {
    if (suggestions.length > 0) {
      if (key.upArrow) {
        setSelectedSuggestion(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        return;
      }
      if (key.downArrow) {
        setSelectedSuggestion(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (key.tab) {
        // Auto-complete with selected suggestion
        const selected = suggestions[selectedSuggestion];
        setValue(`/${selected.name} `);
        setSuggestions([]);
        return;
      }
    }
  });

  const handleSubmit = (submittedValue: string) => {
    if (submittedValue.trim()) {
      onSubmit(submittedValue);
      setValue('');
      setSuggestions([]);
    }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>{'> '}</Text>
        <Box width={80}>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            placeholder={placeholder}
            showCursor={!disabled}
          />
        </Box>
      </Box>
      {suggestions.length > 0 && (
        <Box
          flexDirection="column"
          marginLeft={2}
          marginTop={1}
          borderStyle="single"
          borderColor="gray"
          paddingX={1}
        >
          <Text color="gray">Suggestions:</Text>
          {suggestions.map((cmd, index) => (
            <Box key={cmd.name} marginTop={0}>
              <Text color={index === selectedSuggestion ? 'green' : 'white'}>
                {index === selectedSuggestion ? '▶ ' : '  '}
                /{cmd.name}
              </Text>
              <Text color="gray"> - {cmd.description}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color="gray" dimColor>
              Press Tab to complete, ↑↓ to navigate
            </Text>
          </Box>
        </Box>
      )}
    </Box>
  );
};
