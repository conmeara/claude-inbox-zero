# Claude Inbox – Product Requirements Document (PRD)

## Introduction and Overview

**Claude Inbox** is a command-line email assistant powered by Anthropic’s Claude AI. It streamlines email triage and replies by leveraging AI to summarize emails and draft responses, all within a terminal UI. The tool integrates with Gmail via Anthropic’s **Model Context Protocol (MCP)** to read and send emails on the user’s behalf. By running `claude-inbox`in any terminal, users can process unread emails in batches, review AI-suggested replies, and send them with minimal effort. The interface is built using **Ink** (a React-based CLI framework) to mirror the look-and-feel of Anthropic’s Claude Code terminal experience. This PRD outlines the functionality, user experience, and requirements for Claude Inbox.

## Objectives and Goals

- **Inbox Triage Automation:** Greatly reduce the time and effort needed to reach “Inbox Zero” by automatically summarizing unread emails and composing draft replies.
    
- **Seamless Terminal Experience:** Provide an interactive text-based UI (in the terminal) that feels like a natural extension of coding workflows (inspired by Claude Code’s CLI interface). Users (especially developers or power users) can manage emails without leaving the terminal.
    
- **User-in-the-Loop AI Assistance:** Combine AI automation with user supervision – Claude Inbox drafts responses for each email, but the user reviews, edits, or approves each draft. This ensures quality and personalization in every sent email.
    
- **Efficient Batch Processing:** Handle emails in manageable batches (e.g. 10 at a time) for focused review. Summaries and replies are generated in context, enabling users to confirm and send multiple responses at once.
    
- **Privacy and Control:** The tool operates locally in the user’s environment (local terminal app), with the user’s Gmail data accessed securely via OAuth2 and only used to assist in composing and sending emails. Claude Inbox “fully owns the inbox” access in the sense that, once authorized, it can read and send emails for the user – but always with explicit user confirmation before sending.
    

## Key Features and Functionality

- **Terminal-based UI (Ink Framework):** Claude Inbox runs as a terminal application (`claude-inbox` command). It uses Ink to provide an interactive, component-based text UI, similar to how Claude Code and other modern CLIs work. This allows dynamic content (like lists of emails, prompts, and editable draft messages) to be rendered and updated in place. The UI will use clear text styling (colors, indentation, etc.) to differentiate AI outputs, user prompts, and email content for easy reading.
    
- **Gmail Integration via MCP:** The app integrates with Gmail through Anthropic’s Model Context Protocol. Upon first run, users authenticate their Google account (OAuth 2.0) to grant access to Gmail. The tool may launch a browser or provide an auth link for the user to sign in, after which an OAuth token is stored securely. Using the **Gmail MCP server**, Claude Inbox can list unread emails, read email content, draft replies, and send emails programmatically. (The Gmail MCP provides tools like `listEmails`, `readEmail`, `sendEmail`, etc., which the Claude AI agent or backend can invoke.) Secure credential handling and token refresh are built-in to ensure continuous access without repeated logins.
    
- **CLAUDE.md for Writing Style & Memory:** Claude Inbox will leverage the same **`CLAUDE.md`** concept used in Claude Code to maintain context about the user’s writing style and preferences. A configuration file (e.g. `~/.claude/CLAUDE.md` or a project-specific `CLAUDE.md`) will include guidance such as the user’s tone, signature or “about me” info, and any writing style rules (e.g. “be polite and concise in replies”, preferred email sign-off, etc.). This file is automatically pulled into context when Claude Inbox runs, ensuring the AI’s draft replies align with the user’s persona and preferences. The memory mechanism from Claude Code is utilized so that Claude can “remember” these instructions across sessions. For example, if the user always wants emails to use a friendly tone, this can be documented in CLAUDE.md and will consistently influence all draft replies.
    
- **Contextual Tools (Email & Document Search):** The system can extend Claude’s capabilities with context tools, similar to how Claude Code allows external tool use. In Claude Inbox, this means the AI assistant can fetch additional context when drafting replies. Two primary tools are envisioned: (1) an **email search tool** that lets Claude search the user’s mailbox for related messages (for instance, to find earlier emails in a thread or look up a referenced document/email), and (2) a **document search tool** to find relevant information from a knowledge base or local files if available. These tools would be implemented via MCP servers or APIs and explicitly allowed for the Claude assistant to use during the session. If, for example, an email says “See attached report” or references a past discussion, Claude could invoke the email search tool to retrieve that info and present it as context to the user. The UI will show any extra context fetched (such as a snippet of an earlier email or document) so the user understands what information Claude is using. This feature ensures that replies are accurate and informed by relevant history.
    
- **Unread Email Dashboard:** Upon launching Claude Inbox (after login), the user is presented with a **dashboard**overview of their inbox status. This includes the total number of unread emails and a preview list of subject lines (and possibly senders) of those unread messages. For example, the interface might display: _“You have **23** unread emails. Here are the first 10 unread emails:”_ followed by a numbered list of those emails’ subjects (and perhaps dates or senders for clarity). This gives the user immediate context of what’s pending and sets up the first batch for processing. The list of subject lines allows the user to quickly scan the topics of their unread mail without opening each one.
    
- **Batch Processing of Emails:** Claude Inbox processes emails in batches to avoid overwhelming the user with too much at once. By default, the first batch will include the first **10 unread emails** (though this number might be configurable). After showing the dashboard, the UI will prompt the user: _“Start processing Batch #1 (10 emails)? [Y/n]”_. If the user confirms, the system will “intake” those 10 unread emails as the scope for Batch #1. The selected emails are likely locked or marked in progress so they aren’t processed again. Batching ensures that the AI can summarize and handle a manageable chunk, given token limits and user attention span. After Batch #1 is completed (replied and marked read), the user can proceed to the next batch if more unread emails remain. This approach allows iterative progress toward inbox zero, with the user in control at each step.
    
- **AI Summarization of Email Batch:** Once a batch starts, Claude will first provide a **summary digest** of all emails in that batch. The AI reads the content of each of the 10 emails (via the Gmail MCP read tool) and generates a concise summary for the user. This might be presented as a list of bullet points or numbered items, one per email, highlighting the key point or request of each message. For example: _“**Summary of Batch #1:** 1. Email from Alice about project timeline – asks for updated schedule. 2. Newsletter from TechDaily – latest tech news. 3. Email from Bob (HR) – reminder to submit timesheet, etc.”_ Claude’s summary gives the user a quick overview of what’s in their unread pile without reading each email individually. This digest allows the user to prioritize or mentally prepare for the replies. It’s essentially an AI-curated briefing of your unread emails. _(If any email is very long or complex, Claude will condense it to the main point. The CLAUDE.md memory could include instructions to make summaries short and factual.)_
    
- **Automated Draft Replies:** After summarizing, Claude will proceed to **draft a reply for each email** in the batch _where a response is needed_. Using the content of each email and the user’s stored preferences/style, Claude generates a suggested reply message. These **auto-generated replies** are then presented to the user one by one in the terminal UI for review. For each email, the interface will likely show the email’s key info (e.g., _“Email #1 from Alice – Subject: Project Timeline”_), possibly a short excerpt of the original email if needed, and then **“Claude’s draft reply”** below it. The draft reply text will be formatted clearly (e.g., indented or in a different color) to distinguish it from the original email. The user can scroll or navigate through each draft in sequence. This feature turns the often tedious task of writing responses into a review task – the AI does the initial writing, saving user’s time.
    
- **Interactive Review and Editing:** Claude Inbox is **interactive**, meaning the user can and should review each draft and either accept or modify it. The UI will provide a way for the user to confirm a draft or enter their own input. Specifically, when a draft reply is shown, the user could be prompted with options like **“[Tab] to accept the draft, or start typing to edit.”** The design here mirrors common AI coding assistant behavior (like pressing Tab to accept a suggestion) and leverages Ink’s capability to capture keypresses. If the user presses **Tab**, it means they are satisfied with Claude’s suggested reply as-is; the draft will be marked as accepted without changes. Alternatively, the user can begin typing (or perhaps press an “Edit” key) to modify the draft. In edit mode, the draft text might become an editable text box (in the terminal) where the user can tweak wording, add details, or rewrite as needed. Once editing is done, the user can save that edit (perhaps hitting Enter or a confirm key). Each email draft will be handled in turn: the system may pause after showing a draft to await the user’s decision (accept or edit) before moving to the next email’s draft. This ensures **user oversight** – no email gets sent without the user’s eyes on the reply. It also allows personalization where the AI’s suggestion might not fully capture the nuances the user wants. _(If the user decides not to send a reply to a particular email at all, there should be an option to skip it – e.g. maybe a “Skip” command or just not accepting the draft. Skipped emails could remain unread or be deferred to another batch.)_
    
- **Adaptive AI Queries (Clarifications):** In cases where Claude cannot confidently draft a reply due to missing information, the system will prompt the user for input. For example, if an email asks a question that Claude doesn’t know the answer to (perhaps “What’s the status of task X?” and Claude doesn’t have that context), **Claude will ask the user for the necessary info**. The UI might display a message like: _“Claude: I need additional information to reply to Email #3 (Project status). Please provide the latest status for Project X.”_ The user can then type in a brief answer or detail. Claude will incorporate that information into the draft reply. This interactive query ensures that the assistant can fill in knowledge gaps with the user’s help. It’s facilitated by the Claude Code SDK’s ability to handle multi-turn interactions and tool use mid-task. The UI should make it clear that the AI is waiting for the user’s answer to proceed drafting that particular reply. After the user provides the detail, Claude continues and completes the draft for that email.
    
- **Context Display on Demand:** If needed, Claude Inbox can show additional context to the user, especially when using the context tools. For instance, if Claude used the email search tool to pull up a previous email thread for reference, the UI can display that context (or a summary of it) before showing the draft reply. This way, the user understands why Claude wrote certain things. Similarly, if a document was fetched (say a FAQ or policy document to answer a question), the relevant excerpt might be shown. This feature is meant to build user trust – the user sees the evidence or context Claude used. In practice, this could appear as collapsible sections or just printed text above the draft: _“(Context: Found an earlier email from Alice on 2023-11-01 mentioning the timeline is delayed to Q4.)”_. This gives the user confidence that the draft is accurate, and they can correct Claude if the context used was wrong or outdated.
    
- **Batch Confirmation & Sending:** Once all draft replies in Batch #1 have been reviewed and accepted/edited by the user, Claude Inbox will enter a **confirmation step**. The UI will summarize the actions about to be taken, e.g.: _“Batch #1 is ready to send. 10 messages will be sent and marked as read.”_ It then prompts the user for final confirmation (for example, a simple **“Send all now? (Y/N)”** prompt). If the user confirms, the system goes ahead and uses the Gmail API (via the MCP server’s `sendEmail` or draft-send tools) to send out each reply. Each email in the batch will be sent to its respective recipient, and those threads/email messages will be marked as read in the user’s Gmail. The UI should provide feedback for each send action, such as _“✅ Sent reply to Alice’s email”_ or any error if something fails (e.g., network issue or Gmail API error). This gives transparency that the action completed. After sending, those emails are effectively processed – they leave the unread queue. Claude Inbox effectively automates hitting “Send” on multiple drafts at once, with user approval.
    
- **Post-Batch Flow:** After Batch #1 is completed, the application checks if there are remaining unread emails. If yes, the UI can prompt the user to process the next batch. For example: _“Batch #1 complete. You have 13 unread emails remaining. Start Batch #2? (Y/n)”_. The user can choose to continue to the next batch, which repeats the process (summarize next 10 emails, draft replies, etc.), or exit if they’re done for now. If no unread emails remain, Claude Inbox can congratulate the user (maybe a message like “🎉 Inbox Zero achieved! No unread emails left.”) and then exit or await further input. The user can quit at any time as well (with a command or Ctrl+C), in which case any unprocessed emails remain unread in Gmail (the tool should not mark anything read or send unless explicitly confirmed).
    

## User Interface & Experience Details

The **UI is inspired by Claude Code’s** interface, aiming for clarity and efficiency in a text-only environment. Below are key UI/UX considerations and descriptions:

- **Look and Feel:** The terminal interface will likely use a two-panel or sequential layout. Initially, a list view (for unread emails) is shown. As the user goes into a batch, the interface might clear or scroll and then show each email’s summary and draft. We will use text styling (made possible by Ink and the terminal) to differentiate elements:
    
    - _Colors:_ For example, system prompts and instructions might be in **cyan**, AI-generated text (summaries and draft replies) in **yellow or green**, and user input in **white**. This coloring follows common CLI assistant conventions to make it easy to parse at a glance.
        
    - _Formatting:_ Email **subject lines** could be bold, and important pieces of info (like recipient names or dates) underlined. Draft replies might be indented or prefixed with “Reply: ” to denote it’s the content to send.
        
    - _Status Indicators:_ We may use simple symbols or brackets to indicate states (e.g., “[Draft Accepted]” once the user approves a draft, or “✅ Sent” after sending).  
        These design choices will be refined for readability – since paragraphs shouldn’t be too dense, the tool will break output into digestible chunks and possibly use blank lines to separate emails.
        
- **Navigation & Interaction:** Because this is a CLI app, the user will interact via keyboard. Ink allows capturing of specific keys and rendering components:
    
    - At the dashboard stage, if the user has a choice (start batch or not), a simple **Y/n prompt** is used. The user types `y` or `n` (or hits Enter for default).
        
    - During draft review, the interaction is a bit more complex: the user needs to review and accept/edit drafts sequentially. We plan to implement this by focusing on one draft at a time with a small prompt. For example, after showing the draft text, the interface might show **“[Tab] Accept – [E] Edit – [S] Skip”** as hints at the bottom. The user can press the Tab key to accept immediately. If they press `e` (for edit) or start typing any other character, that will trigger edit mode for that draft. In edit mode, the UI could open a small text editor area (possibly multi-line if needed) pre-filled with Claude’s draft. The user can modify the text (Ink can integrate with text input components). Pressing Enter (or a special key combo) would save the edited version and exit edit mode. Then the UI moves to the next email’s draft. Skipping could mark that email as “to handle later” (remaining unread) without sending a reply.
        
    - If at any point the user wants to abort the whole process, they could press a key like `q` or `Ctrl+C` to quit. Claude Inbox should handle this gracefully (perhaps confirming if they want to quit before sending any unsent drafts).
        
    - Scrolling: If an email or draft is long, the UI might allow scrolling within that text. However, summarization should reduce the need for scrolling original emails. Still, we might include a way to view full email content if the user requests (e.g., a `[V] View Email` option to print the full email body above the draft for deeper context).
        
- **Error Handling & Messages:** The UI will also display error or info messages as needed. For instance, if the Gmail API fails to fetch an email (network issue), the tool might show an error line in red like _“Error: Failed to retrieve Email #4. Skipping it for now.”_ and continue with the rest, notifying the user. If sending fails for an email, it should report which one failed and why (if possible), and perhaps offer to retry.  
    Additionally, if the user input is invalid (e.g., they press a wrong key at a prompt), the UI can show a small hint like _“Unrecognized option, please press the indicated keys.”_ to guide them.
    
- **Performance Considerations:** The interface will indicate when it’s thinking or working, so the user isn’t left guessing. For example, after the user starts a batch, there may be a loading indicator or message like _“Fetching emails and generating summaries… (this may take a few seconds)”_. During AI processing (which could take a bit of time especially if summarizing 10 emails and drafting replies), a spinner or progress message can reassure the user that work is in progress. Once done, the output (summaries or drafts) will appear. We may also print intermediate status like _“Summarized 5/10 emails…”_ if it’s a longer wait.
    
- **Mirroring Claude Code UI:** Since **“UI should mirror Claude Code”** is a requirement, we will incorporate elements from Claude Code’s design:
    
    - Claude Code’s CLI often behaves like a conversational agent in the terminal. Claude Inbox will similarly present Claude’s outputs (summaries, replies) in a conversational style (perhaps prefixed by the assistant’s name or an icon) to reinforce that these are AI-generated.
        
    - In Claude Code, a special `CLAUDE.md` is auto-loaded and certain commands (like slash commands or memory edits) exist. In Claude Inbox, we might not expose slash commands, but we ensure the startup sequence pulls in `CLAUDE.md` and any configured memory. This happens behind the scenes, but the effect on UI is that from the first output, the AI is already using the proper style (thanks to CLAUDE.md context).
        
    - Claude Code likely uses color and indenting for code suggestions. In Claude Inbox, we adapt that style for email text. For example, code blocks might be irrelevant here, but we might indent the reply text block similarly to how Claude Code indents multi-line outputs.
        
    - The overall tone of the UI is assistant-like and helpful, which matches Claude Code’s philosophy of a “power tool” CLI. Claude Inbox will present itself as a helpful “AI email clerk” in your terminal, always ready with a summary or suggestion.
        

## Workflow Step-by-Step

To illustrate how a user would interact with Claude Inbox, below is a typical session workflow broken into steps:

1. **Launch and Login:** The user opens a terminal and runs `claude-inbox`. The program starts and immediately checks for Gmail authorization. If not already authenticated, it prompts the user to sign into Google. For example, it might output: _“Welcome to Claude Inbox. Please authorize access to your Gmail account to proceed.”_ A URL or QR code might be provided for OAuth; once the user grants access, Claude Inbox receives the token (possibly via an MCP server callback or manual code entry) and confirms: _“✔️ Gmail account authorized.”_ (On subsequent runs, if a token is stored, this step is skipped or happens silently.) The Gmail MCP server is launched or contacted in the background with the user’s credentials at this point, enabling the email tools for Claude.
    
2. **Initial Dashboard Display:** After login, the tool retrieves the count of unread emails (using the Gmail API). The terminal UI then displays something like:
    
    ```
    Gmail Inbox (user@example.com) – Unread Emails: 24  
    ---------------------------------------------------  
    1. [Unread] “Project Update – timeline” – from Alice Smith, Oct 10  
    2. [Unread] “Your Weekly Newsletter” – from TechDaily, Oct 9  
    3. [Unread] “Reminder: Submit Timesheet” – from Bob (HR), Oct 9  
    ...  
    4. [Unread] “Re: Budget Proposal Questions” – from Client X, Oct 8  
    ```
    
    It lists up to 10 subject lines (with sender and date for context). This is Batch #1. Below the list, it might say: _“(24 unread emails total. Displaying 10.)”_ and then prompt the user: _“Process these 10 emails now? (Y/n)”_. The user confirms to continue. _(If the user chooses no, they can quit or perhaps filter which emails to process first – filtering is an advanced option, not in MVP scope unless needed.)_
    
3. **Summarization of Batch:** Claude Inbox now fetches the content of those 10 emails via the Gmail MCP’s `readEmail` tool (for example, getting the full text of each message). It then invokes the Claude AI (through the Claude Code SDK) to summarize the batch. During this step, the UI might display a status like _“Summarizing 10 emails…please wait.”_ Once done, the summaries are printed:
    
    ```
    Summary of Batch #1:  
    - Alice is asking for an updated project timeline and wants to know if we are on track for the November release.  
    - TechDaily Newsletter with highlights of last week’s tech news (no response needed).  
    - Bob from HR reminds you to submit your timesheet by Friday.  
    ...  
    - Client X has follow-up questions about the budget proposal, seeking clarification on two line items.  
    ```
    
    Each bullet corresponds to an email, giving the gist. The summaries make clear which emails require a response (e.g., #1, #3, #10 are asking something) and which might not (#2 is just informational). Claude uses the user’s name or context appropriately in summaries if needed (in this example, not much personal info is needed aside from recognizing a newsletter vs. an actionable email).
    
4. **Drafting Replies:** Next, Claude generates draft replies for the emails that need responses. The UI proceeds to cycle through each email in the batch, presenting the draft one at a time for user review:
    
    - **For Email 1 (Alice’s project timeline):** The program might show:
        
        ```
        ---  
        Email #1 – From: Alice Smith, Subject: "Project Update – timeline"  
        Claude’s Draft Reply:  
        Hi Alice,  
        Thanks for checking in. The project is on track for the November release. We’ve just updated the timeline to include the final testing phase, which will run through the first week of November. Everything is proceeding according to schedule, and I’ll send you the updated timeline document shortly.  
        Best regards,  
        [Your Name]  
        ```
        
        Below this draft, the UI prompts: _“Press [Tab] to accept this reply, or type to edit.”_ Suppose the user realizes they haven’t actually prepared the updated timeline document promised in the draft – they may choose to edit the reply to be more cautious. They start typing, which triggers an edit mode. The interface could open a simple editor (in-line or a popup in terminal) showing the draft text which the user can modify. The user edits one sentence to: _“…we anticipate being on schedule for the November release; I will send an updated timeline by end of day tomorrow.”_ Once satisfied, they press Enter to save the edit. The UI then marks Email 1’s reply as ready (maybe showing “[✔️ Edited]” next to it) and moves on.
        
    - **For Email 2 (Newsletter):** Since it’s a newsletter with no response needed, Claude might either skip drafting a reply or produce a note like “No reply necessary.” The UI could simply say: _“Email #2 is a newsletter/no response required. Marking as read.”_ and automatically mark it as read when the batch completes. The user can just press Enter to acknowledge and move on.
        
    - **For Email 3 (HR reminder):** The draft might be straightforward: e.g., _“Hi Bob, I’ve submitted my timesheet for this week. Thanks for the reminder!”_. The user reviews and finds it fine. They hit Tab to accept it without changes. The UI maybe highlights that it’s accepted (e.g., the draft text might turn green or a checkmark appears).
        
    - … and so on for each email in the batch.
        
    
    During this process, if any email’s draft needs more info: e.g., **Email 10 (Client’s budget questions)**: Claude might pause and ask the user, _“Client X is asking about budget details I’m not aware of. Could you provide the figures or clarifications for their questions?”_. The user can then input something like, “They want to know why Q3 expenses increased – the answer is due to additional marketing spend – and whether the pricing includes maintenance – answer: yes, a year of maintenance is included.” Claude takes that input and formulates a proper reply incorporating it. The new draft might read: _“Hi Client, Thanks for your questions. The Q3 expenses increased due to additional marketing spend as we expanded our campaign. And yes, our pricing includes one year of maintenance support, as outlined… etc.”_. The user reviews this final draft, maybe makes a minor tweak, and accepts it.
    
    Each draft review is done in sequence. The UI ensures the user clearly knows which email they’re handling (by numbering and showing sender/subject as context). The **Claude Code SDK** is working under the hood here to manage the conversation and tool usage with Claude (the AI agent), but to the user it feels like a guided wizard for replying to emails.
    
5. **Confirmation to Send:** After iterating through all 10 emails, the UI recaps the actions: e.g., _“Drafts prepared for 9 emails. 1 email required no reply and will be marked read.”_ Then it asks: _“Send all 9 drafted replies now and mark those 10 emails as read? (Y/n)”_. This final confirmation is critical to give the user full control – nothing is sent until this point. The user types “Y” to confirm. Claude Inbox then uses the Gmail MCP’s `sendEmail` or `draftEmail + send` functions to send out each accepted reply. As it sends, it can print a log line per email, e.g.:
    
    - “Sending reply to Alice Smith... ✅ Sent.”
        
    - “Marking TechDaily newsletter as read.”
        
    - “Sending reply to Bob (HR)... ✅ Sent.”
        
    - … etc.  
        If any send fails, it would show an error and possibly retry or skip that email with a warning. After all, it confirms: _“Batch #1 complete. 10 emails processed.”_
        
6. **Follow-up Batches or Exit:** If there are remaining unread emails (in our example, after 10 processed, 14 remain), the tool then offers to proceed: _“You have 14 unread emails left. Process the next batch? (Y/n)”_. The user can continue with Batch #2, which would repeat the cycle for the next set of emails. If the user is done, they can decline. The program would then exit, perhaps with a friendly message like _“Thank you for using Claude Inbox. 14 emails remain unread.”_ (So the user knows there’s still pending work). In a future run, it would start again from those remaining emails.
    
