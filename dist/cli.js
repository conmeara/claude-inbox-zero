#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import React from 'react';
import App from './app.js';
import Setup from './components/Setup.js';
import { ConfigService } from './services/config.js';
import { AIService } from './services/ai.js';
import { MockInboxService } from './services/mockInbox.js';
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
    .action(async (options) => {
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
                        debug: options.debug
                    }));
                }, 100);
            }
        }));
    }
    else {
        // Start the main app directly
        render(React.createElement(App, {
            resetInbox: options.reset,
            debug: options.debug
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
    const tempInboxService = new MockInboxService();
    const aiService = new AIService(tempInboxService);
    const result = await aiService.testApiKey();
    if (result.success) {
        console.log('✅', result.message);
    }
    else {
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
    }
    else {
        console.log('\nRun "claude-inbox test" to verify your API key is working.');
    }
});
program.parse();
//# sourceMappingURL=cli.js.map