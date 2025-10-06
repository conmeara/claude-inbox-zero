import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface DescriptiveOption<T> {
  key: string;
  title: string;
  description: string;
  value: T;
}

interface DescriptiveRadioButtonSelectProps<T> {
  options: Array<DescriptiveOption<T>>;
  onSelect: (value: T) => void;
  initialIndex?: number;
}

export function DescriptiveRadioButtonSelect<T>({
  options,
  onSelect,
  initialIndex = 0,
}: DescriptiveRadioButtonSelectProps<T>): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(options[selectedIndex].value);
    }
  });

  return (
    <Box flexDirection="column">
      {options.map((option, index) => (
        <Box key={option.key} flexDirection="column" marginY={0}>
          <Box>
            <Text color={index === selectedIndex ? 'cyan' : 'white'} bold={index === selectedIndex}>
              {index === selectedIndex ? '● ' : '○ '}
              {option.title}
            </Text>
          </Box>
          <Box marginLeft={2}>
            <Text color="gray">{option.description}</Text>
          </Box>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text color="gray">Use ↑↓ to navigate, Enter to select</Text>
      </Box>
    </Box>
  );
}
