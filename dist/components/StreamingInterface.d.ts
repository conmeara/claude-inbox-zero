import React from 'react';
import { EmailService } from '../services/email-service.js';
import { EmailDraft } from '../types/email.js';
interface StreamingInterfaceProps {
    inboxService: EmailService;
    debug?: boolean;
    onComplete: (drafts: EmailDraft[]) => void;
    onBack: () => void;
}
declare const StreamingInterface: React.FC<StreamingInterfaceProps>;
export default StreamingInterface;
//# sourceMappingURL=StreamingInterface.d.ts.map