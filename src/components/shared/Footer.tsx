import React from 'react';
import { Box, Text } from 'ink';
import path from 'node:path';

interface FooterProps {
  mode?: 'mock' | 'gmail' | 'imap';
  modelName?: string;
  debug?: boolean;
}

export const Footer: React.FC<FooterProps> = ({
  mode = 'mock',
  modelName = 'claude-sonnet-4',
  debug = false
}) => {
  const cwd = process.cwd();
  const displayPath = path.basename(cwd);

  return (
    <Box justifyContent="space-between" width="100%" marginTop={1}>
      {/* Left: Current directory */}
      <Box>
        {debug && <Text color="red">[DEBUG] </Text>}
        <Text color="cyan">{displayPath}</Text>
      </Box>

      {/* Center: Mode indicator */}
      <Box>
        <Text color="yellow">{mode}-mode</Text>
      </Box>

      {/* Right: Model name */}
      <Box>
        <Text color="magenta">{modelName}</Text>
      </Box>
    </Box>
  );
};
