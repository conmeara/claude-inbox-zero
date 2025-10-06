import React from 'react';
import { Email, EmailDraft } from '../types/email.js';
import { AIService } from '../services/ai.js';
import { EmailQueueManager } from '../services/email-queue-manager.js';
import { RefinementQueue } from '../services/refinement-queue.js';
import { InitialGenerationQueue } from '../services/initial-generation-queue.js';
import { EmailService } from '../services/email-service.js';
interface DraftReviewProps {
    emails: Email[];
    onComplete: (drafts: EmailDraft[]) => void;
    onBack: () => void;
    inboxService: EmailService;
    debug?: boolean;
    preInitializedAiService?: AIService | null;
    preInitializedQueueManager?: EmailQueueManager | null;
    preInitializedGenerationQueue?: InitialGenerationQueue | null;
    preInitializedRefinementQueue?: RefinementQueue | null;
}
declare const DraftReview: React.FC<DraftReviewProps>;
export default DraftReview;
//# sourceMappingURL=DraftReview.d.ts.map