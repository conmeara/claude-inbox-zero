import React from 'react';
import { Email } from '../types/email.js';
interface BatchSummaryProps {
    emails: Email[];
    onContinue: () => void;
    onBack: () => void;
    debug?: boolean;
}
declare const BatchSummary: React.FC<BatchSummaryProps>;
export default BatchSummary;
//# sourceMappingURL=BatchSummary.d.ts.map