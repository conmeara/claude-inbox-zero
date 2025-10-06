import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
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
  const [searchText, setSearchText] = useState('');
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
          <Text color="yellow">
            ✉️  Welcome to Claude Inbox!
          </Text>
        </Box>

        {/* Inbox Summary */}
        <Box marginBottom={1}>
          <Text>
            Unread Emails: <Text bold color="yellow">{totalUnread}</Text>
          </Text>
          <Text color="gray"> • AI Mode: </Text>
          <Text color={configService.hasApiKey() ? "green" : "yellow"}>
            {configService.hasApiKey() ? "Claude API" : "Pattern Matching"}
          </Text>
        </Box>

        {/* Email Preview */}
        <Box flexDirection="column" marginBottom={1}>
          <Text color="cyan">
            First {Math.min(currentBatch.length, 10)} unread emails:
          </Text>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          
          {currentBatch.slice(0, 10).map((email, index) => (
            <Box key={email.id} marginLeft={2}>
              <Text color="white">
                {(index + 1).toString().padStart(2, ' ')}. 
              </Text>
              <Text bold>"{truncateSubject(email.subject)}"</Text>
              <Text color="gray"> - from </Text>
              <Text color="green">{email.from.name}</Text>
              <Text color="gray">, </Text>
              <Text color="gray">{formatDate(email.date)}</Text>
            </Box>
          ))}
        </Box>

        {totalUnread > 10 && (
          <Box marginBottom={1}>
            <Text color="gray">
              ({totalUnread - 10} more unread emails)
            </Text>
          </Box>
        )}
      </Box>

      {/* Text Input Box and Navigation */}
      {showPrompt && (
        <Box flexDirection="column" marginTop={1}>
          <Box borderStyle="round" borderColor="white" borderDimColor paddingX={1} flexDirection="row" alignItems="center">
            <Text color="gray">{'>'} </Text>
            <TextInput
              value={searchText}
              onChange={setSearchText}
              placeholder={isReady ? "Ready to process all emails..." : "Preparing emails..."}
            />
          </Box>
          <Box justifyContent="space-between">
            <Text color={isReady ? "white" : "gray"} dimColor={!isReady}>
              {isReady ? "Tab to Start" : "Waiting for emails to be ready..."}
            </Text>
            {processingCount > 0 && !isReady && (
              <Text color="cyan">
                <Spinner type="dots" /> Processing {readyCount}/3 emails...
              </Text>
            )}
            {isReady && (
              <Text color="green">
                ✓ {readyCount} emails ready!
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