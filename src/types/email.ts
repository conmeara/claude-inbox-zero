export interface EmailSender {
  name: string;
  email: string;
}

export interface Email {
  id: string;
  from: EmailSender;
  subject: string;
  date: string;
  body: string;
  unread: boolean;
  requiresResponse: boolean;
}

export interface EmailSummary {
  emailId: string;
  summary: string;
}

export interface EmailDraft {
  emailId: string;
  draftContent: string;
  status: 'pending' | 'accepted' | 'edited' | 'skipped';
  editedContent?: string;
}

export interface EmailBatch {
  emails: Email[];
  summaries: EmailSummary[];
  drafts: EmailDraft[];
}

export interface InboxData {
  emails: Email[];
}

// Email state in the processing queue
export type EmailState =
  | 'queued'        // In primary queue, not yet shown
  | 'reviewing'     // Currently displayed to user
  | 'refining'      // Background AI refinement in progress
  | 'refined'       // Refinement done, waiting for re-review
  | 'accepted'      // User accepted, ready to send
  | 'skipped'       // User skipped
  | 'failed';       // Refinement failed

// Email with processing state and metadata
export interface EmailQueueItem {
  email: Email;
  summary: string;
  draft?: EmailDraft;
  state: EmailState;
  refinedDraft?: string;           // New draft after refinement
  refinementFeedback?: string;     // What user asked for
  refinementCount?: number;        // Number of refinements applied
}

// Queue status for UI display
export interface QueueStatus {
  primaryRemaining: number;        // Unprocessed emails
  refinedWaiting: number;          // Refined emails ready for review
  completed: number;               // Accepted/skipped emails
  refining: number;                // Currently being refined in background
  currentState?: EmailState;       // State of current email
}

// Search criteria for inbox tools
export interface InboxSearchCriteria {
  query?: string;
  from?: string;
  requiresResponse?: boolean;
}