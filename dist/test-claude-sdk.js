#!/usr/bin/env node
import { query } from '@anthropic-ai/claude-agent-sdk';
// First email from Alice Johnson
const firstEmail = {
    id: "1",
    from: {
        name: "Alice Johnson",
        email: "alice@techcorp.com"
    },
    subject: "Project Timeline Update Request",
    date: "2024-01-21T09:15:00Z",
    body: `Hi there,

I hope this email finds you well. I wanted to touch base regarding the Q1 project timeline we discussed last week. Our stakeholders are asking for an updated schedule, particularly around the delivery milestones for the API integration phase.

Could you please provide an updated timeline by EOD Wednesday? Specifically, I need to know:
- When will the API endpoints be ready for testing?
- What's the expected completion date for the authentication module?
- Are there any blockers that might impact our February 15th deadline?

Thanks for your attention to this.

Best regards,
Alice`
};
async function testClaudeSDK() {
    console.log('🧪 Testing Claude Code SDK Email Reply...\n');
    console.log('📧 Original Email:');
    console.log(`From: ${firstEmail.from.name} <${firstEmail.from.email}>`);
    console.log(`Subject: ${firstEmail.subject}`);
    console.log(`\n${firstEmail.body}`);
    console.log('\n' + '='.repeat(60) + '\n');
    const prompt = `You are helping me reply to emails. Please write a professional email reply to this message:

From: ${firstEmail.from.name} <${firstEmail.from.email}>
Subject: ${firstEmail.subject}
Date: ${firstEmail.date}

Email Content:
${firstEmail.body}

Write a complete email reply that:
- Addresses all their questions about the project timeline
- Provides specific dates/timelines where appropriate
- Is professional and helpful
- Uses a warm but business-appropriate tone

Write only the email body content, starting with a greeting and ending with a professional closing.`;
    try {
        console.log('🤖 Generating reply with Claude SDK...\n');
        const messages = [];
        // Use the Claude Code SDK to generate a response
        for await (const message of query({
            prompt: prompt,
            options: {
                maxTurns: 1
            }
        })) {
            messages.push(message);
            // Log system messages
            if (message.type === 'system' && message.subtype === 'init') {
                console.log(`⏳ Initialized with model: ${message.model}`);
            }
        }
        // Extract the response
        let response = '';
        // Look for result message type
        const resultMessage = messages.find(msg => msg.type === 'result');
        if (resultMessage && resultMessage.type === 'result' && 'result' in resultMessage) {
            response = resultMessage.result.trim();
        }
        else {
            // Also check for assistant messages with text content
            const assistantMessage = messages.find(msg => msg.type === 'assistant');
            if (assistantMessage && assistantMessage.type === 'assistant') {
                const content = assistantMessage.message.content;
                if (Array.isArray(content) && content[0] && 'text' in content[0]) {
                    response = content[0].text.trim();
                }
            }
        }
        if (response) {
            console.log('✅ Generated Reply:\n');
            console.log(response);
        }
        else {
            console.error('❌ No response generated. Messages received:', messages.map(m => ({ type: m.type, ...(m.type === 'result' ? { subtype: m.subtype } : {}) })));
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 Make sure you have set the ANTHROPIC_API_KEY environment variable');
    }
}
// Run the test
testClaudeSDK();
//# sourceMappingURL=test-claude-sdk.js.map