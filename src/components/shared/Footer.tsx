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
  // Footer hidden for cleaner UI
  return null;
};
