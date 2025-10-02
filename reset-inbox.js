import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read the inbox data
const inboxPath = path.join(__dirname, 'mock-data', 'inbox.json');
const data = JSON.parse(fs.readFileSync(inboxPath, 'utf-8'));

// Mark all emails as unread
data.emails.forEach(email => {
  email.unread = true;
});

// Write back to file
fs.writeFileSync(inboxPath, JSON.stringify(data, null, 2));

console.log(`✅ Reset complete! All ${data.emails.length} emails marked as unread.`);