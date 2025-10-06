import React, { ReactNode } from 'react';
import { Box } from 'ink';
import { Footer } from '../shared/Footer.js';
import { LoadingIndicator } from '../shared/LoadingIndicator.js';
import { useConfig } from '../../contexts/ConfigContext.js';
import { useUIState } from '../../contexts/UIStateContext.js';

interface DefaultLayoutProps {
  children: ReactNode;
}

export const DefaultLayout: React.FC<DefaultLayoutProps> = ({ children }) => {
  const config = useConfig();
  const { state } = useUIState();

  return (
    <Box flexDirection="column" width="90%">
      {/* Loading indicator at top */}
      <LoadingIndicator
        thought={state.currentThought}
        elapsedTime={state.elapsedTime}
      />

      {/* Main content area */}
      <Box flexDirection="column">
        {children}
      </Box>

      {/* Footer at bottom */}
      <Footer
        mode={config.mode}
        modelName={config.modelName}
        debug={config.debug}
      />
    </Box>
  );
};
