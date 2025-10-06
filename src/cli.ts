#!/usr/bin/env node

import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import Setup from './components/Setup.js';
import { ConfigService } from './services/config.js';
import { AIService } from './services/ai.js';
import { EmailService } from './services/email-service.js';
import { GmailAuthService } from './services/gmail-auth.js';

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
  .option('-g, --gmail', 'Use real Gmail account instead of mock data')
  .action(async (options) => {
    // Check if Gmail mode requires auth
    if (options.gmail) {
      const gmailAuth = new GmailAuthService();
      if (!gmailAuth.hasValidCredentials()) {
        console.log('❌ Gmail not authenticated. Run "claude-inbox setup-gmail" first.\n');
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
              useGmail: options.gmail
            }));
          }, 100);
        }
      }));
    } else {
      // Start the main app directly
      render(React.createElement(App, {
        resetInbox: options.reset,
        debug: options.debug,
        useGmail: options.gmail
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

// Gmail setup command
program
  .command('setup-gmail')
  .description('Authenticate with Gmail account')
  .action(async () => {
    console.log('🔐 Gmail Authentication\n');
    console.log('This will open a browser window to authenticate with your Gmail account.');
    console.log('You\'ll need to grant Claude Inbox permission to read and modify your emails.\n');

    const gmailAuth = new GmailAuthService();

    try {
      // Check if already authenticated
      if (gmailAuth.hasValidCredentials()) {
        console.log('✅ Gmail is already authenticated!\n');
        console.log('To re-authenticate, first run: claude-inbox revoke-gmail\n');
        process.exit(0);
      }

      // Start OAuth flow
      await gmailAuth.authenticate();
      console.log('\n✅ Gmail authentication successful!');
      console.log('You can now use: claude-inbox --gmail\n');
      process.exit(0);
    } catch (error: any) {
      console.log('\n❌ Gmail authentication failed:', error.message);
      console.log('Please try again or check your OAuth credentials.\n');
      process.exit(1);
    }
  });

// Revoke Gmail command
program
  .command('revoke-gmail')
  .description('Revoke Gmail authentication')
  .action(async () => {
    console.log('🔓 Revoking Gmail authentication...\n');

    const gmailAuth = new GmailAuthService();

    try {
      await gmailAuth.revokeCredentials();
      console.log('✅ Gmail authentication revoked successfully.\n');
      console.log('Run "claude-inbox setup-gmail" to re-authenticate.\n');
      process.exit(0);
    } catch (error: any) {
      console.log('❌ Failed to revoke credentials:', error.message);
      process.exit(1);
    }
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
    
    if (!hasKey) {
      console.log('\nRun "claude-inbox setup" to configure your API key.');
    } else {
      console.log('\nRun "claude-inbox test" to verify your API key is working.');
    }
  });

program.parse();