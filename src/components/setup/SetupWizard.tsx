import React, { useState } from 'react';
import { Box } from 'ink';
import { WelcomeScreen } from './WelcomeScreen.js';
import { ApiKeySetup } from './ApiKeySetup.js';
import { EmailModeSelection } from './EmailModeSelection.js';
import { markSetupComplete } from '../../utils/first-run-config.js';

type SetupStep = 'welcome' | 'api-key' | 'email-mode' | 'complete';

interface SetupWizardProps {
  onComplete: (config: { emailMode: 'mock' | 'imap'; hasApiKey: boolean }) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState<SetupStep>('welcome');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);

  const handleApiKeySelect = (selected: boolean) => {
    setHasApiKey(selected);
    setCurrentStep('email-mode');
  };

  const handleEmailModeSelect = (mode: 'mock' | 'imap') => {
    // Save configuration
    markSetupComplete(mode, hasApiKey);

    // Complete setup
    setCurrentStep('complete');
    onComplete({ emailMode: mode, hasApiKey });
  };

  return (
    <Box flexDirection="column" width="100%">
      {currentStep === 'welcome' && (
        <WelcomeScreen onContinue={() => setCurrentStep('api-key')} />
      )}
      {currentStep === 'api-key' && <ApiKeySetup onSelect={handleApiKeySelect} />}
      {currentStep === 'email-mode' && (
        <EmailModeSelection onSelect={handleEmailModeSelect} />
      )}
    </Box>
  );
};
