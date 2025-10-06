import React from 'react';
import { Box, Text } from 'ink';

interface WelcomeScreenProps {
  onContinue: () => void;
}

const ASCII_LOGO = `
   ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
  ██╔════╝██║     ██╔══██╗██║   ██║██║  ██╗██╔════╝
  ██║     ██║     ███████║██║   ██║██║  ██║█████╗
  ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
  ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
   ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝

  ██╗███╗   ██╗██████╗  ██████╗ ██╗  ██╗
  ██║████╗  ██║██╔══██╗██╔═══██╗╚██╗██╔╝
  ██║██╔██╗ ██║██████╔╝██║   ██║ ╚███╔╝
  ██║██║╚██╗██║██╔══██╗██║   ██║ ██╔██╗
  ██║██║ ╚████║██████╔╝╚██████╔╝██╔╝ ██╗
  ╚═╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝

         ███████╗███████╗██████╗  ██████╗
         ╚══███╔╝██╔════╝██╔══██╗██╔═══██╗
           ███╔╝ █████╗  ██████╔╝██║   ██║
          ███╔╝  ██╔══╝  ██╔══██╗██║   ██║
         ███████╗███████╗██║  ██║╚██████╔╝
         ╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝
`;

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onContinue }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 2000);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={2}>
      <Text color="cyan">{ASCII_LOGO}</Text>
      <Box marginTop={1}>
        <Text color="magenta" bold>v1.0.0</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">AI-powered email triage assistant</Text>
      </Box>
    </Box>
  );
};
