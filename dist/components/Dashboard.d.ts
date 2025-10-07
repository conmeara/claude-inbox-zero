import React from 'react';
import { EmailService } from '../services/email-service.js';
interface DashboardProps {
    inboxService: EmailService;
    debug?: boolean;
    onStartBatch: () => void;
    batchOffset: number;
    readyCount?: number;
    processingCount?: number;
    concurrency?: number;
}
declare const Dashboard: React.FC<DashboardProps>;
export default Dashboard;
//# sourceMappingURL=Dashboard.d.ts.map