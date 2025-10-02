import React from 'react';
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
declare const SendConfirm: React.FC<SendConfirmProps>;
export default SendConfirm;
//# sourceMappingURL=SendConfirm.d.ts.map