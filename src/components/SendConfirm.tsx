import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Email, EmailDraft } from '../types/email.js';
import { MockInboxService } from '../services/mockInbox.js';

interface SendConfirmProps {
  emails: Email[];
  drafts: EmailDraft[];
  inboxService: MockInboxService;
  onComplete: () => void;
  onBack: () => void;
  debug?: boolean;
}

type SendState = 'confirming' | 'sending' | 'complete' | 'error';

const SendConfirm: React.FC<SendConfirmProps> = ({ 
  emails, 
  drafts, 
  inboxService,
  onComplete, 
  onBack, 
  debug = false 
}) => {
  const [state, setState] = useState<SendState>('confirming');
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState<string>('');

  const acceptedDrafts = drafts.filter(draft => 
    draft.status === 'accepted' || draft.status === 'edited'
  );
  const emailsToMarkRead = emails.map(email => email.id);
  const informationalEmails = emails.filter(email => !email.requiresResponse);

  useInput((input, key) => {
    if (state === 'confirming') {
      if (input.toLowerCase() === 'y' || key.return) {
        startSending();
      } else if (input.toLowerCase() === 'n' || input.toLowerCase() === 'b') {
        onBack();
      }
    } else if (state === 'complete' || state === 'error') {
      if (key.return || input.toLowerCase() === 'c') {
        onComplete();
      }
    }
  });

  const startSending = async () => {
    setState('sending');
    
    try {
      // Simulate sending emails (in real app, this would use Gmail API)
      for (let i = 0; i < acceptedDrafts.length; i++) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setSentCount(i + 1);
      }

      // Mark all emails in the batch as read
      await inboxService.markEmailsAsRead(emailsToMarkRead);
      
      setState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send emails');
      setState('error');
    }
  };

  const getEmailById = (id: string): Email | undefined => {
    return emails.find(email => email.id === id);
  };

  const getDraftContent = (draft: EmailDraft): string => {
    return draft.status === 'edited' && draft.editedContent 
      ? draft.editedContent 
      : draft.draftContent;
  };

  if (state === 'sending') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text color="cyan"> Sending emails and marking as read...</Text>
        </Box>
        
        <Box marginBottom={1}>
          <Text>
            Progress: {sentCount}/{acceptedDrafts.length} replies sent
          </Text>
        </Box>

        {acceptedDrafts.map((draft, index) => {
          const email = getEmailById(draft.emailId);
          const isSent = index < sentCount;
          const isCurrent = index === sentCount;
          
          return (
            <Box key={draft.emailId} marginLeft={2}>
              <Text color={isSent ? "green" : isCurrent ? "yellow" : "gray"}>
                {isSent ? "✅" : isCurrent ? "📤" : "⏳"}
              </Text>
              <Text color="gray"> Replying to </Text>
              <Text color="white">{email?.from.name}</Text>
              <Text color="gray"> - "{email?.subject}"</Text>
            </Box>
          );
        })}
      </Box>
    );
  }

  if (state === 'error') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Text color="red">❌ Error: {error}</Text>
        <Text>Some emails may have been sent successfully.</Text>
        <Text color="cyan">Press [Enter] to continue</Text>
      </Box>
    );
  }

  if (state === 'complete') {
    return (
      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text color="green" bold>
            🎉 Batch Complete!
          </Text>
        </Box>

        <Box flexDirection="column" marginBottom={1}>
          <Text color="green">✅ {acceptedDrafts.length} replies sent successfully</Text>
          <Text color="blue">📧 {informationalEmails.length} informational emails marked as read</Text>
          <Text color="cyan">📥 {emails.length} total emails processed</Text>
        </Box>

        <Box marginBottom={1}>
          <Text color="gray">
            All emails in this batch have been processed and marked as read.
          </Text>
        </Box>

        <Text color="cyan">Press [Enter] to continue or [C] to see next batch</Text>
      </Box>
    );
  }

  // Confirming state
  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          📤 Send Confirmation
        </Text>
      </Box>

      {/* Summary */}
      <Box flexDirection="column" marginBottom={1}>
        <Text>Ready to process this batch:</Text>
        <Box marginLeft={2} marginTop={1}>
          <Text color="green">✉️  {acceptedDrafts.length} replies will be sent</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="blue">📧 {informationalEmails.length} informational emails will be marked read</Text>
        </Box>
        <Box marginLeft={2}>
          <Text color="yellow">⏭️  {drafts.filter(d => d.status === 'skipped').length} emails skipped (remain unread)</Text>
        </Box>
      </Box>

      {/* Draft Preview */}
      {acceptedDrafts.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="yellow">Replies to send:</Text>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
          
          {acceptedDrafts.map((draft, index) => {
            const email = getEmailById(draft.emailId);
            const content = getDraftContent(draft);
            const isEdited = draft.status === 'edited';
            
            return (
              <Box key={draft.emailId} flexDirection="column" marginBottom={1}>
                <Box>
                  <Text color="white">
                    {(index + 1).toString().padStart(2, ' ')}. 
                  </Text>
                  <Text color="gray"> To: </Text>
                  <Text color="green">{email?.from.name}</Text>
                  <Text color="gray"> - "{email?.subject}"</Text>
                  {isEdited && <Text color="yellow"> [EDITED]</Text>}
                </Box>
                <Box marginLeft={4}>
                  <Text color="gray">
                    "{content.substring(0, 80)}{content.length > 80 ? '...' : ''}"
                  </Text>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Confirmation Prompt */}
      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        <Text color="red" bold>
          ⚠️  This will send real emails and mark messages as read!
        </Text>
        <Text>
          Send {acceptedDrafts.length} replies and mark {emails.length} emails as read?
        </Text>
        <Text color="cyan">
          Press [Y] to send, [N] to go back
        </Text>
      </Box>

      {/* Debug Info */}
      {debug && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Total drafts: {drafts.length}</Text>
          <Text color="gray">- Accepted: {drafts.filter(d => d.status === 'accepted').length}</Text>
          <Text color="gray">- Edited: {drafts.filter(d => d.status === 'edited').length}</Text>
          <Text color="gray">- Skipped: {drafts.filter(d => d.status === 'skipped').length}</Text>
          <Text color="gray">- Emails to mark read: {emailsToMarkRead.length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default SendConfirm;