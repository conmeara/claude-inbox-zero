#!/usr/bin/env node

import { AIService } from './dist/services/ai.js';
import { MockInboxService } from './dist/services/mockInbox.js';

async function testFlow() {
  console.log('🧪 Testing Claude Inbox Flow...\n');
  
  const inboxService = new MockInboxService();
  const aiService = new AIService();
  
  try {
    // Load inbox data
    await inboxService.loadInboxData();
    console.log('✅ Loaded inbox data');
    
    // Get first batch of emails
    const batch = inboxService.getEmailBatch(10, 0);
    console.log(`✅ Got batch of ${batch.length} emails`);
    
    // Initialize AI service
    await aiService.initialize();
    console.log('✅ Initialized AI service');
    
    // Generate drafts for all emails
    console.log('\n📝 Generating drafts...');
    const drafts = await aiService.generateEmailDrafts(batch);
    
    console.log(`\n✅ Generated ${drafts.length} drafts`);
    console.log(`   - Drafts with content: ${drafts.filter(d => d.draftContent).length}`);
    console.log(`   - Skipped (no response needed): ${drafts.filter(d => d.status === 'skipped').length}`);
    
    // Show a sample draft
    const sampleDraft = drafts.find(d => d.draftContent);
    if (sampleDraft) {
      const email = batch.find(e => e.id === sampleDraft.emailId);
      console.log('\n📧 Sample Draft:');
      console.log(`   From: ${email.from.name}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   Draft: ${sampleDraft.draftContent.substring(0, 100)}...`);
    }
    
    console.log('\n✅ Flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFlow();