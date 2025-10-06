import { EmailDatabase, EmailRecord, Recipient } from './email-database.js';
import * as fs from 'fs';
import * as path from 'path';

interface MockEmail {
  id: string;
  from: {
    name: string;
    email: string;
  };
  subject: string;
  date: string;
  body: string;
  unread: boolean;
  requiresResponse: boolean;
}

interface MockInboxData {
  emails: MockEmail[];
}

/**
 * Seed the SQLite database with mock email data from JSON file
 */
export async function seedMockData(db: EmailDatabase, mockDataPath?: string): Promise<number> {
  const dataPath = mockDataPath || path.join(process.cwd(), 'mock-data', 'inbox.json');

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Mock data file not found: ${dataPath}`);
  }

  const fileContent = fs.readFileSync(dataPath, 'utf-8');
  const mockData: MockInboxData = JSON.parse(fileContent);

  console.log(`Seeding database with ${mockData.emails.length} mock emails...`);

  let count = 0;

  for (const mockEmail of mockData.emails) {
    // Convert mock email to EmailRecord format
    const emailRecord: EmailRecord = {
      message_id: mockEmail.id,
      from_address: mockEmail.from.email,
      from_name: mockEmail.from.name,
      subject: mockEmail.subject,
      body_text: mockEmail.body,
      date_sent: new Date(mockEmail.date),
      is_read: !mockEmail.unread,
      requires_response: mockEmail.requiresResponse,
      folder: 'INBOX',
      snippet: mockEmail.body.substring(0, 200),
    };

    // For mock data, we'll set a simple recipient (the user)
    const recipients: Recipient[] = [
      {
        email_id: 0, // Will be set by insertEmail
        type: 'to',
        address: 'user@example.com',
        name: 'User'
      }
    ];

    // Insert email into database
    db.insertEmail(emailRecord, recipients, []);
    count++;
  }

  console.log(`Successfully seeded ${count} emails`);
  return count;
}

/**
 * Reset database by clearing all data and reseeding
 */
export async function resetMockData(db: EmailDatabase, mockDataPath?: string): Promise<void> {
  console.log('Clearing existing data...');
  db.clearAll();

  await seedMockData(db, mockDataPath);
}
