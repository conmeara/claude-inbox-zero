import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

interface LoadingIndicatorProps {
  thought?: string;
  elapsedTime?: number;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  thought,
  elapsedTime
}) => {
  if (!thought) {
    return null;
  }

  return (
    <Box marginY={1}>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text color="cyan"> {thought}</Text>
      {elapsedTime !== undefined && (
        <Text color="gray"> ({elapsedTime.toFixed(1)}s)</Text>
      )}
    </Box>
  );
};
