# Email Agent Subagent Selection Guide

## Overview
This guide helps Claude select the appropriate subagent for email-related tasks. Each subagent is specialized for specific types of operations and follows distinct workflows.

## Available Subagents

### 1. email-searcher
**Purpose**: Email search specialist for finding relevant emails through strategic searching

**Use this agent when:**
- User asks to find specific emails or types of emails
- Complex multi-criteria email searches are needed
- Need to discover emails through progressive refinement
- Looking for emails related to a topic, sender, date range, or content
- Need comprehensive search across entire email history
- User wants to analyze email patterns or trends

**Examples:**
- "Find all invoices from Q4"
- "Show me emails from my boss last month"
- "Search for emails about the project deadline"
- "Find all unread emails with attachments"
- "What urgent emails do I have from this week?"
- "Find all emails from Alice about the budget"

**When NOT to use:**
- User wants to write or refine an email draft (use draft-writer instead)
- User is already reviewing a specific email and just needs a draft

### 2. draft-writer
**Purpose**: Email draft specialist for writing and refining professional email replies

**Use this agent when:**
- User needs to write a reply to an email
- User wants to refine or improve an existing draft
- User requests changes to tone, length, or content
- User wants to add context from other emails to a draft
- User is editing a draft and gives feedback

**Examples:**
- "Draft a reply to this meeting request"
- "Make this draft more formal"
- "Shorten this email"
- "Add urgency to this response"
- "Reference the budget discussion in my reply"
- "Write a polite decline to this invitation"

**When NOT to use:**
- User wants to search for emails (use email-searcher instead)
- User wants to find information in their inbox

## Output Formatting Guidelines

### For Search Results
When presenting email results:
1. Use markdown formatting for readability
2. Use **bold** for important info (subjects, senders)
3. Group related emails together
4. Include relevant metadata (date, sender, attachments)
5. Provide context about why each email is relevant
6. Limit output to reasonable amounts (20-50 emails)

Example output format:
```markdown
## Search Results: Q4 Budget Emails

Found 3 relevant emails:

- **Q4 Budget Final Version** from Alice Chen <alice@company.com>
  *Date: Jan 15, 2025* | 📎 Has Excel attachment
  → This appears to be the final budget report you requested

- **Re: Q4 Budget Review** from Bob Smith <bob@company.com>
  *Date: Jan 16, 2025*
  → Follow-up discussion with feedback on Alice's budget
```

### For Email Drafts
When presenting drafts:
1. Show only the final draft (no explanations unless asked)
2. Use proper email format (greeting, body, closing)
3. Maintain markdown for readability but draft should be plain text ready
4. Ask if further refinement is needed

Example output format:
```
Hi Sarah,

[draft content here]

Best regards

---
Would you like me to make any changes to this draft?
```

## Best Practices

1. **Choose the right agent**: Each agent is optimized for specific tasks
2. **Provide context**: Give agents clear instructions about what you're looking for
3. **Use specific queries**: Be precise in search terms and draft requirements
4. **Iterate when needed**: Don't hesitate to refine searches or drafts based on results
5. **Format output properly**: Use markdown and clear structure for readability

## Decision Flow

```
User Query
    |
    ├─ Mentions "find", "search", "show me emails"
    |  → Use email-searcher
    |
    ├─ Mentions "draft", "write", "reply", "respond"
    |  → Use draft-writer
    |
    ├─ Mentions "refine", "improve", "make this more..."
    |  → Use draft-writer (if about a draft)
    |  → Use email-searcher (if about search results)
    |
    └─ Unclear or mixed intent
       → Ask user to clarify
       → Or default to email-searcher for discovery
```

## Important Notes

1. **Main app handles email triage** - Subagents are for specific delegation tasks, not the main email processing workflow
2. **Subagents work with tools** - They have access to inbox search and read tools
3. **Log files in Gmail mode** - Search results are written to log files for analysis
4. **Multi-turn support** - Both subagents can engage in back-and-forth refinement

## Examples of When to Delegate

### Scenario 1: User in main app asks a search question
```
During email review, user asks: "Have I gotten any other emails from Alice this week?"

Action: This is a search task → Delegate to email-searcher subagent
```

### Scenario 2: User wants draft improvement
```
User editing draft says: "Make this reference the budget report Alice sent last week"

Action: This is a draft writing task requiring search → Delegate to draft-writer subagent
(The draft-writer can use search tools to find Alice's budget email)
```

### Scenario 3: Complex workflow
```
User asks: "Find all urgent emails from this week and draft replies to the important ones"

Action: Multi-step task
1. Delegate to email-searcher to find urgent emails
2. Present results to user
3. User selects which ones to reply to
4. Delegate each reply to draft-writer
```

Remember: The goal is to use the right specialized agent for each task to provide the best user experience.
