import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import { EmailService } from '../services/email-service.js';
import { Email, EmailDraft } from '../types/email.js';
import { AIService } from '../services/ai.js';
import { ConfigService } from '../services/config.js';

// Animated dot component like Claude Code
const AnimatedDot: React.FC<{ status: 'processing' | 'success' | 'error' | 'default' }> = ({ status }) => {
  const [dotIndex, setDotIndex] = useState(0);
  const dots = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setDotIndex((prev) => (prev + 1) % dots.length);
      }, 80);
      return () => clearInterval(interval);
    }
  }, [status, dots.length]);

  if (status === 'processing') {
    return <Text color="white">{dots[dotIndex]} </Text>;
  } else if (status === 'success') {
    return <Text color="green">● </Text>;
  } else if (status === 'error') {
    return <Text color="red">● </Text>;
  } else {
    return <Text color="white">● </Text>;
  }
};

interface StreamingInterfaceProps {
  inboxService: EmailService;
  debug?: boolean;
  onComplete: (drafts: EmailDraft[]) => void;
  onBack: () => void;
}

type InterfaceState = 'dashboard' | 'streaming' | 'error';

interface ProcessedEmail {
  email: Email;
  summary: string;
  draft?: EmailDraft;
  status: 'processing' | 'ready' | 'accepted' | 'skipped' | 'edited';
}

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

const StreamingInterface: React.FC<StreamingInterfaceProps> = ({ 
  inboxService, 
  debug = false, 
  onComplete, 
  onBack 
}) => {
  const [state, setState] = useState<InterfaceState>('dashboard');
  const [dashboardVisible, setDashboardVisible] = useState(true);
  const [processedEmails, setProcessedEmails] = useState<ProcessedEmail[]>([]);
  const [currentEmailIndex, setCurrentEmailIndex] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [allEmails, setAllEmails] = useState<Email[]>([]);
  const [allDrafts, setAllDrafts] = useState<EmailDraft[]>([]);
  
  // Chat and input state
  const [inputText, setInputText] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingText, setEditingText] = useState('');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStatusComplete, setIsStatusComplete] = useState(false);
  
  // Services
  const [aiService] = useState(() => new AIService(inboxService));
  const [configService] = useState(() => new ConfigService());
  
  // Dashboard data
  const [unreadEmails, setUnreadEmails] = useState<Email[]>([]);
  const [currentBatch, setCurrentBatch] = useState<Email[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    // Initialize dashboard data
    const emails = inboxService.getUnreadEmails();
    const batch = inboxService.getEmailBatch(10, 0);
    
    setUnreadEmails(emails);
    setCurrentBatch(batch);
    setTotalUnread(emails.length);
    setAllEmails(emails);
  }, [inboxService]);

  useEffect(() => {
    if (state === 'streaming' && processingIndex < allEmails.length) {
      processNextEmail();
    }
  }, [state, processingIndex]);

  const processNextEmail = async () => {
    if (processingIndex >= allEmails.length) return;

    const emailToProcess = allEmails[processingIndex];
    
    // Add email in processing state
    const processingEmail: ProcessedEmail = {
      email: emailToProcess,
      summary: '',
      status: 'processing'
    };
    
    setProcessedEmails(prev => [...prev, processingEmail]);

    try {
      // Initialize AI service if needed
      await aiService.initialize();
      
      // Generate summary
      const summary = await aiService.summarizeEmail(emailToProcess);
      
      // Generate draft if needed
      let draft: EmailDraft | undefined;
      if (emailToProcess.requiresResponse) {
        const draftContent = await aiService.generateEmailDraft(emailToProcess);
        draft = {
          emailId: emailToProcess.id,
          draftContent,
          status: 'pending'
        };
        setAllDrafts(prev => [...prev, draft!]);
      }

      // Update email to ready state
      setProcessedEmails(prev => prev.map((pe, index) => 
        index === processingIndex 
          ? { ...pe, summary, draft, status: 'ready' }
          : pe
      ));

      // Move to next email
      setProcessingIndex(prev => prev + 1);
    } catch (error) {
      console.error(`Failed to process email ${emailToProcess.id}:`, error);
      
      // Mark as ready with error state
      setProcessedEmails(prev => prev.map((pe, index) => 
        index === processingIndex 
          ? { ...pe, summary: 'Error processing email', status: 'ready' }
          : pe
      ));
      
      setProcessingIndex(prev => prev + 1);
    }
  };

  const handleStartStreaming = async () => {
    setState('streaming');
    // Keep dashboard visible in streaming mode
    setProcessingIndex(0);
    
    // Initialize AI service
    try {
      await aiService.initialize();
    } catch (error) {
      console.error('Failed to initialize AI service:', error);
    }
  };

  const handleAcceptDraft = () => {
    const currentEmail = processedEmails[currentEmailIndex];
    if (currentEmail?.draft) {
      // Update draft status
      const updatedDrafts = allDrafts.map(d => 
        d.emailId === currentEmail.draft!.emailId 
          ? { ...d, status: 'accepted' as const }
          : d
      );
      setAllDrafts(updatedDrafts);
      
      // Update processed email status
      setProcessedEmails(prev => prev.map((pe, index) => 
        index === currentEmailIndex 
          ? { ...pe, status: 'accepted' }
          : pe
      ));
      
      moveToNextEmail();
    }
  };

  const handleSkipEmail = () => {
    const currentEmail = processedEmails[currentEmailIndex];
    if (currentEmail) {
      if (currentEmail.draft) {
        const updatedDrafts = allDrafts.map(d => 
          d.emailId === currentEmail.draft!.emailId 
            ? { ...d, status: 'skipped' as const }
            : d
        );
        setAllDrafts(updatedDrafts);
      }
      
      setProcessedEmails(prev => prev.map((pe, index) => 
        index === currentEmailIndex 
          ? { ...pe, status: 'skipped' }
          : pe
      ));
      
      moveToNextEmail();
    }
  };

  const moveToNextEmail = () => {
    if (currentEmailIndex < processedEmails.length - 1) {
      setCurrentEmailIndex(prev => prev + 1);
    } else if (currentEmailIndex === allEmails.length - 1) {
      // All emails processed
      onComplete(allDrafts);
    }
  };

  const handleChatSubmit = async () => {
    if (!inputText.trim()) return;
    
    console.log('handleChatSubmit called with:', inputText);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    
    // Handle AI improvement requests
    const currentEmail = processedEmails[currentEmailIndex];
    console.log('Current email:', currentEmail);
    console.log('Has draft:', !!currentEmail?.draft);
    
    if (currentEmail?.draft) {
      // Any message with a current draft is treated as an AI improvement request
      const feedback = inputText.toLowerCase().startsWith('ai:') 
        ? inputText.substring(3).trim() 
        : inputText;
      
      try {
        setIsProcessing(true);
        const improvedDraft = await aiService.improveEmailDraft(
          currentEmail.draft.editedContent || currentEmail.draft.draftContent,
          feedback,
          currentEmail.email,
          (status) => {
            setProcessingStatus(status);
            setIsStatusComplete(status.includes('successfully') || status.includes('complete'));
          }
        );
        
        // Update the draft
        const updatedDrafts = allDrafts.map(d => 
          d.emailId === currentEmail.draft!.emailId 
            ? { ...d, editedContent: improvedDraft }
            : d
        );
        setAllDrafts(updatedDrafts);
        
        setProcessedEmails(prev => prev.map((pe, index) => 
          index === currentEmailIndex 
            ? { ...pe, draft: { ...pe.draft!, editedContent: improvedDraft } }
            : pe
        ));
        
        // Show completion with green bullet
        setTimeout(() => {
          setProcessingStatus('');
          setIsStatusComplete(false);
        }, 1500);
      } catch (error) {
        setProcessingStatus('Failed to improve draft. Please try again.');
        setIsStatusComplete(false);
        setTimeout(() => {
          setProcessingStatus('');
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    }
    
    setInputText('');
  };

  useInput((input, key) => {
    // Don't interfere with text input when user is typing
    if (state === 'dashboard') {
      if (key.tab) {
        handleStartStreaming();
      } else if (key.escape) {
        process.exit(0);
      }
    } else if (state === 'streaming' && !isEditingMode && !isProcessing) {
      if (key.tab) {
        handleAcceptDraft();
      } else if (key.rightArrow) {
        handleSkipEmail();
      } else if (key.downArrow) {
        const currentEmail = processedEmails[currentEmailIndex];
        if (currentEmail?.draft) {
          setEditingText(currentEmail.draft.editedContent || currentEmail.draft.draftContent);
          setIsEditingMode(true);
        }
      } else if (key.escape) {
        onBack();
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

  const renderDashboard = () => (
    <Box borderStyle="round" borderColor="#CC785C" padding={1} flexDirection="column">
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="yellow">
          Welcome to Claude Inbox!
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
  );

  const renderEmailCard = (processedEmail: ProcessedEmail, index: number, isLast: boolean = false) => {
    const { email, summary, draft, status } = processedEmail;
    const isActive = index === currentEmailIndex;
    
    // For non-active emails, render normally
    if (!isActive) {
      return (
        <Box 
          key={email.id} 
          flexDirection="column" 
          marginBottom={1}
          borderStyle="single"
          borderColor="gray"
          padding={1}
        >
          {/* Email Header */}
          <Box marginBottom={1}>
            <AnimatedDot 
              status={
                status === 'processing' 
                  ? 'processing' 
                  : status === 'accepted' 
                    ? 'success'
                    : status === 'skipped'
                      ? 'default'
                      : 'default'
              } 
            />
            <Text bold>Email {index + 1} of {allEmails.length}</Text>
            {status === 'processing' && (
              <Text color="gray">
                {' '}<Spinner type="dots" /> Processing...
              </Text>
            )}
          </Box>

          {/* Sender */}
          <Box>
            <Text color="gray">├── </Text>
            <Text>{email.from.name}</Text>
          </Box>

          {/* Subject */}
          <Box>
            <Text color="gray">├── </Text>
            <Text color="gray">{email.subject}</Text>
          </Box>

          {/* Date */}
          <Box>
            <Text color="gray">{summary ? "├── " : "└── "}</Text>
            <Text color="gray" dimColor>{formatDate(email.date)}</Text>
          </Box>

          {/* Summary */}
          {summary && (
            <Box>
              <Text color="gray">└── </Text>
              <Text>Summary: {summary}</Text>
            </Box>
          )}

          {/* Status */}
          {status === 'accepted' && (
            <Box marginTop={1}>
              <Text color="green">Draft accepted</Text>
            </Box>
          )}
          {status === 'skipped' && (
            <Box marginTop={1}>
              <Text color="gray">Skipped</Text>
            </Box>
          )}
        </Box>
      );
    }
    
    // For active email, we'll render it differently (merged with input)
    // This will be handled in the main render
    return null;
  };

  const renderActiveEmailCard = () => {
    const processedEmail = processedEmails[currentEmailIndex];
    if (!processedEmail) return null;
    
    const { email, summary, draft, status } = processedEmail;
    
    return (
      <Box 
        flexDirection="column" 
        marginBottom={1}
        borderStyle="round"
        borderColor="#CC785C"
        padding={1}
      >
        {/* Email Header */}
        <Box marginBottom={1}>
          <AnimatedDot 
            status={
              status === 'processing' 
                ? 'processing' 
                : status === 'accepted' 
                  ? 'success'
                  : status === 'skipped'
                    ? 'default'
                    : 'default'
            } 
          />
          <Text bold>Email {currentEmailIndex + 1} of {allEmails.length}</Text>
          {status === 'processing' && (
            <Text color="gray">
              {' '}<Spinner type="dots" /> Processing...
            </Text>
          )}
        </Box>

        {/* Sender */}
        <Box>
          <Text color="gray">├── </Text>
          <Text>{email.from.name}</Text>
        </Box>

        {/* Subject */}
        <Box>
          <Text color="gray">├── </Text>
          <Text>{email.subject}</Text>
        </Box>

        {/* Date */}
        <Box>
          <Text color="gray">{summary ? "├── " : "└── "}</Text>
          <Text color="gray" dimColor>{formatDate(email.date)}</Text>
        </Box>

        {/* Summary */}
        {summary && (
          <Box>
            <Text color="gray">└── </Text>
            <Text>Summary: {summary}</Text>
          </Box>
        )}

        {/* Draft */}
        {draft && (
          <>
            <Box marginTop={1}>
              <AnimatedDot status="default" />
              <Text>Draft Reply:</Text>
            </Box>
            <Box marginLeft={2} marginBottom={1}>
              <Text color="white">{draft.editedContent || draft.draftContent}</Text>
            </Box>
          </>
        )}

        {/* Processing Status */}
        {processingStatus && (
          <Box marginBottom={1}>
            <AnimatedDot 
              status={
                processingStatus.includes('Failed') || processingStatus.includes('Error') 
                  ? 'error' 
                  : isStatusComplete 
                    ? 'success' 
                    : 'processing'
              } 
            />
            <Text color="gray" dimColor>
              {processingStatus}
            </Text>
          </Box>
        )}

        {/* Chat Messages */}
        {chatMessages.length > 0 && (
          <Box flexDirection="column" marginTop={1} marginBottom={1}>
            {chatMessages.slice(-3).map((message, idx) => (
              <Box key={message.id} marginBottom={1}>
                <Text color="gray">{idx === chatMessages.slice(-3).length - 1 ? "└── " : "├── "}</Text>
                <Text color={message.isUser ? "cyan" : "white"}>
                  {message.isUser ? "You: " : ""}{message.text}
                </Text>
              </Box>
            ))}
          </Box>
        )}

        {/* Separator */}
        <Box marginTop={1} marginBottom={1}>
          <Text color="gray">─────────────────────────────────────────────────────────────────────</Text>
        </Box>

        {/* Text Input */}
        <Box flexDirection="row" alignItems="center">
          <Text color="gray">{'>'} </Text>
          <TextInput
            value={inputText}
            onChange={setInputText}
            onSubmit={handleChatSubmit}
            placeholder="Chat with Claude or use controls..."
          />
        </Box>
      </Box>
    );
  };

  const renderChatMessages = () => (
    <Box flexDirection="column" marginBottom={1}>
      {chatMessages.slice(-3).map(message => (
        <Box key={message.id} marginLeft={message.isUser ? 2 : 0}>
          <Text color={message.isUser ? "cyan" : "green"}>
            {message.isUser ? "You: " : "Claude: "}{message.text}
          </Text>
        </Box>
      ))}
    </Box>
  );

  return (
    <Box flexDirection="column" paddingY={1}>
      {/* Dashboard Section */}
      {dashboardVisible && renderDashboard()}
      
      {/* Email Stream Section */}
      {state === 'streaming' && (
        <Box flexDirection="column">
          {/* Render completed/skipped emails */}
          {processedEmails
            .filter((_, index) => index < currentEmailIndex)
            .map((processedEmail, index) => 
              renderEmailCard(processedEmail, index)
            )}
          
          {/* Render the active email with merged input box */}
          {processedEmails[currentEmailIndex] && renderActiveEmailCard()}
          
          {/* Controls - outside the active email box */}
          {processedEmails[currentEmailIndex] && (
            <Box marginTop={1}>
              <Text color="white" dimColor>
                Tab: Accept • →: Skip • ↓: Edit • Esc: Back
              </Text>
            </Box>
          )}
        </Box>
      )}
      
      {/* Dashboard Input Area - only show when not streaming */}
      {state === 'dashboard' && (
        <Box flexDirection="column" marginTop={1}>
          <Box borderStyle="round" borderColor="white" borderDimColor paddingX={1} flexDirection="row" alignItems="center">
            <Text color="gray">{'>'} </Text>
            <TextInput
              value={inputText}
              onChange={setInputText}
              onSubmit={handleChatSubmit}
              placeholder="Ready to process all emails..."
            />
          </Box>
          <Text color="white" dimColor>
            Tab to Start • Esc to Exit
          </Text>
        </Box>
      )}

      {/* Debug Info */}
      {debug && state === 'streaming' && (
        <Box flexDirection="column" marginTop={2} paddingTop={1} borderStyle="single" borderColor="gray">
          <Text color="gray">Debug Info:</Text>
          <Text color="gray">- Processed emails: {processedEmails.length}/{allEmails.length}</Text>
          <Text color="gray">- Current email index: {currentEmailIndex}</Text>
          <Text color="gray">- Processing index: {processingIndex}</Text>
          <Text color="gray">- Total drafts: {allDrafts.length}</Text>
        </Box>
      )}
    </Box>
  );
};

export default StreamingInterface;