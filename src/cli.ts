#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import Setup from './components/Setup.js';
import { ConfigService } from './services/config.js';
import { AIService } from './services/ai.js';
import { EmailService } from './services/email-service.js';
import { ImapManager, type ImapConfig } from './services/imap-manager.js';
import { EmailSyncService } from './services/imap-sync.js';
import * as readline from 'readline/promises';

const program = new Command();

const configService = new ConfigService();

program
  .name('claude-inbox')
  .description('AI-powered email triage assistant in your terminal')
  .version('1.0.0');

// Main command
program
  .option('-r, --reset', 'Reset inbox to mark all emails as unread (for demo purposes)')
  .option('-d, --debug', 'Enable debug mode')
  .option('-i, --imap', 'Use IMAP account (works with any email provider)')
  .option('-c, --concurrency <number>', 'Number of emails to process in parallel (default: 10, max: 50)', (value) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      console.error('Error: concurrency must be a number between 1 and 50');
      process.exit(1);
    }
    return parsed;
  })
  .action(async (options) => {
    // Check if IMAP mode requires config
    if (options.imap) {
      try {
        ImapManager.getInstance();
      } catch (error: any) {
        console.log('❌ IMAP not configured. Run "claude-inbox setup-imap" first.\n');
        process.exit(1);
      }
    }

    // Check if setup is needed
    if (!configService.hasApiKey()) {
      console.log('🔧 First time setup required...\n');

      // Run setup first
      render(React.createElement(Setup, {
        onComplete: () => {
          // After setup, start the main app
          setTimeout(() => {
            render(React.createElement(App, {
              resetInbox: options.reset,
              debug: options.debug,
              useImap: options.imap,
              concurrency: options.concurrency
            }));
          }, 100);
        }
      }));
    } else {
      // Start the main app directly
      render(React.createElement(App, {
        resetInbox: options.reset,
        debug: options.debug,
        useImap: options.imap,
        concurrency: options.concurrency
      }));
    }
  });

// Setup command
program
  .command('setup')
  .description('Configure your Anthropic API key')
  .action(() => {
    render(React.createElement(Setup, {
      onComplete: () => {
        console.log('\n✅ Setup complete! Run "claude-inbox" to start processing emails.');
        process.exit(0);
      }
    }));
  });

// Test command
program
  .command('test')
  .description('Test your API key configuration')
  .action(async () => {
    console.log('🧪 Testing API key configuration...\n');

    // Create temporary inbox service for testing
    const tempInboxService = new EmailService('mock');
    await tempInboxService.loadInboxData();
    const aiService = new AIService(tempInboxService);

    const result = await aiService.testApiKey();

    if (result.success) {
      console.log('✅', result.message);
    } else {
      console.log('❌', result.message);
      console.log('\nRun "claude-inbox setup" to configure your API key.');
      process.exit(1);
    }
  });

// IMAP setup command
program
  .command('setup-imap')
  .description('Configure IMAP account (works with Gmail, Outlook, etc.)')
  .action(async () => {
    console.log('📧 IMAP Email Configuration\n');
    console.log('This works with any email provider that supports IMAP.');
    console.log('Common providers: Gmail, Outlook, Yahoo, ProtonMail, etc.\n');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    try {
      const email = await rl.question('Email address: ');
      const password = await rl.question('App-specific password (or regular password): ');
      const host = await rl.question('IMAP host (e.g., imap.gmail.com): ') || 'imap.gmail.com';
      const port = await rl.question('IMAP port (default: 993): ') || '993';

      console.log('\n🔐 Testing connection...');

      const config: Partial<ImapConfig> = {
        user: email,
        password,
        host,
        port: parseInt(port),
        tls: true
      };

      const success = await ImapManager.testConnection(config);

      if (success) {
        ImapManager.saveConfig(config);
        console.log('\n✅ IMAP configuration saved successfully!');
        console.log('\nYou can now use: claude-inbox --imap');
        console.log('To sync your emails first, run: claude-inbox sync\n');
      } else {
        console.log('\n❌ Connection test failed. Please check your credentials and try again.\n');
        process.exit(1);
      }
    } catch (error: any) {
      console.log('\n❌ Setup failed:', error.message);
      process.exit(1);
    } finally {
      rl.close();
    }
  });

// Sync command
program
  .command('sync')
  .description('Sync emails from IMAP to local database')
  .option('-d, --days <number>', 'Number of days to sync (default: 7)', '7')
  .option('-f, --full', 'Full sync (last 30 days from all folders)')
  .option('-u, --unread', 'Sync only unread emails')
  .action(async (options) => {
    console.log('🔄 Email Sync\n');

    try {
      const syncService = new EmailSyncService();

      if (options.full) {
        console.log('Running full sync (last 30 days)...\n');
        const result = await syncService.fullSync();
        console.log(`\n✅ Sync complete: ${result.synced} new emails, ${result.skipped} already synced`);
      } else if (options.unread) {
        console.log('Syncing unread emails...\n');
        const result = await syncService.syncUnread();
        console.log(`\n✅ Sync complete: ${result.synced} new emails, ${result.skipped} already synced`);
      } else {
        const days = parseInt(options.days);
        console.log(`Syncing last ${days} days...\n`);
        const result = await syncService.syncRecent(days);
        console.log(`\n✅ Sync complete: ${result.synced} new emails, ${result.skipped} already synced`);
      }

      const stats = syncService.getStats();
      console.log(`\n📊 Database: ${stats.total_emails} total emails, ${stats.unread_count} unread\n`);

      syncService.close();
      process.exit(0);
    } catch (error: any) {
      console.log('❌ Sync failed:', error.message);
      console.log('\nMake sure you\'ve run "claude-inbox setup-imap" first.\n');
      process.exit(1);
    }
  });

// Status command
program
  .command('status')
  .description('Show current configuration status')
  .action(() => {
    console.log('📊 Claude Inbox Status\n');

    const hasKey = configService.hasApiKey();
    const keySource = process.env.ANTHROPIC_API_KEY ? 'Environment Variable' : 'Config File';

    console.log(`API Key Configured: ${hasKey ? '✅ Yes' : '❌ No'}`);
    if (hasKey) {
      console.log(`API Key Source: ${keySource}`);
    }
    console.log(`Config File: ${hasKey ? '~/.claude-inbox-config.json' : 'Not created'}`);

    // Check IMAP status
    try {
      ImapManager.getInstance();
      console.log(`IMAP Configured: ✅ Yes`);
    } catch {
      console.log(`IMAP Configured: ❌ No`);
    }

    if (!hasKey) {
      console.log('\nRun "claude-inbox setup" to configure your API key.');
    } else {
      console.log('\nRun "claude-inbox test" to verify your API key is working.');
    }
  });

program.parse();