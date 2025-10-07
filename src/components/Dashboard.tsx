import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { EmailService } from '../services/email-service.js';
import { Email } from '../types/email.js';
import { ConfigService } from '../services/config.js';

interface DashboardProps {
  inboxService: EmailService;
  debug?: boolean;
  onStartBatch: () => void;
  batchOffset: number;
  readyCount?: number;
  processingCount?: number;
}

const Dashboard: React.FC<DashboardProps> = ({
  inboxService,
  debug = false,
  onStartBatch,
  batchOffset,
  readyCount = 0,
  processingCount = 0
}) => {
  const [unreadEmails, setUnreadEmails] = useState<Email[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Email[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [batchNumber, setBatchNumber] = useState(1);
  const [showPrompt, setShowPrompt] = useState(false);
  const configService = new ConfigService();

  const isReady = readyCount >= 3;

  useEffect(() => {
    const emails = inboxService.getUnreadEmails();
    const batch = inboxService.getEmailBatch(10, batchOffset);

    setUnreadEmails(emails);
    setCurrentBatch(batch);
    setTotalUnread(emails.length);
    setBatchNumber(Math.floor(batchOffset / 10) + 1);
    setShowPrompt(true);
  }, [inboxService, batchOffset]);

  useInput((input, key) => {
    if (showPrompt) {
      if (key.tab && isReady) {
        onStartBatch();
      } else if (input.toLowerCase() === 'n') {
        process.exit(0);
      } else if (key.ctrl && input === 's') {
        // TODO: Open settings dialog
        console.log('Settings invoked (not yet implemented)');
      }
    }
  });

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateSubject = (subject: string, maxLength: number = 60): string => {
    return subject.length > maxLength ? subject.substring(0, maxLength) + '...' : subject;
  };

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Main Container with Border */}
      <Box borderStyle="round" borderColor="#CC785C" padding={1} flexDirection="column">
        {/* Header */}
        <Box marginBottom={1}>
          <Text bold>Claude Inbox</Text>
        </Box>

        {/* Inbox Summary */}
        <Box marginBottom={1}>
          <Text color="gray">
            Unread Emails: <Text bold>{totalUnread}</Text>
          </Text>
          <Text color="gray"> • AI Mode: </Text>
          <Text color="gray">
            {configService.hasApiKey() ? "Claude API" : "Pattern Matching"}
          </Text>
        </Box>

        {/* Email Preview */}
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>
            First {Math.min(currentBatch.length, 10)} unread emails
          </Text>
          <Box marginTop={1} flexDirection="column">
          {currentBatch.slice(0, 10).map((email, index) => (
            <Box key={email.id}>
              <Text color="cyan">• </Text>
              <Text>{truncateSubject(email.subject)}</Text>
              <Text color="gray"> - from </Text>
              <Text>{email.from.name}</Text>
              <Text color="gray">, </Text>
              <Text color="gray">{formatDate(email.date)}</Text>
            </Box>
          ))}
          </Box>
        </Box>

        {totalUnread > 10 && (
          <Box marginBottom={1}>
            <Text color="gray">
              ({totalUnread - 10} more unread emails)
            </Text>
          </Box>
        )}
      </Box>

      {/* Progress Bar and Controls */}
      {showPrompt && (
        <Box flexDirection="column" marginTop={1}>
          {processingCount > 0 && !isReady && (
            <Box flexDirection="column" marginBottom={1}>
              <Box justifyContent="space-between">
                <Text color="gray">Preparing emails...</Text>
                <Text color="gray">{readyCount}/3 ready</Text>
              </Box>
              <Box marginTop={1}>
                <Text color="cyan">{'['}</Text>
                <Text color="cyan">{'█'.repeat(Math.floor((readyCount / 3) * 20))}</Text>
                <Text color="gray">{'░'.repeat(20 - Math.floor((readyCount / 3) * 20))}</Text>
                <Text color="cyan">{']'}</Text>
                <Text color="gray"> {Math.floor((readyCount / 3) * 100)}%</Text>
              </Box>
            </Box>
          )}
          <Box justifyContent="space-between">
            <Text color="gray">
              {isReady ? "Press Tab to start processing emails" : "Waiting for emails to be ready..."}
            </Text>
            {isReady && (
              <Text color="gray">
                Press Ctrl+S for settings
              </Text>
            )}
          </Box>
        </Box>
      )}

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Total emails: {inboxService.getTotalEmailCount()}</Text>
          <Text color="gray">- Unread: {totalUnread}</Text>
          <Text color="gray">- Requiring response: {inboxService.getEmailsRequiringResponse().length}</Text>
          <Text color="gray">- Current batch size: {currentBatch.length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard;