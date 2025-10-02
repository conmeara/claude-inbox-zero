import React from 'react';
import { MockInboxService } from '../services/mockInbox.js';
import { EmailDraft } from '../types/email.js';
interface StreamingInterfaceProps {
    inboxService: MockInboxService;
    debug?: boolean;
    onComplete: (drafts: EmailDraft[]) => void;
    onBack: () => void;
}
declare const StreamingInterface: React.FC<StreamingInterfaceProps>;
export default StreamingInterface;
//# sourceMappingURL=StreamingInterface.d.ts.map