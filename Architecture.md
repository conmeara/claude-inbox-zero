# Recommended Tech Stack for Claude Inbox

**Programming Language & Runtime:** Anthropic’s Claude Code is written in **TypeScript** running on Node.js. We should match that by using Node.js (v18+) with TypeScript for Claude Inbox. TypeScript’s strong typing aids maintainability and aligns with Claude Code’s existing codebase. A modern Node.js (LTS) environment on macOS (10.15+) is supported.

**CLI Framework & Terminal UI:** Claude Code uses the **commander** library for parsing CLI commands and **Ink** (a React-based CLI UI framework) for rendering the terminal interface. We recommend the same: use Commander (or similar like `yargs`) for defining commands/flags, and use Ink for building interactive CLI components with React. This mirrors Claude Code’s stack and provides a rich TUI (text-based UI) experience. Inks’s use of React hooks and context will handle interactive state (e.g. chat prompts, auto-mode, etc.) in a declarative way.

**Package Manager:** Claude Code is distributed via **npm** (the Node package manager). We should likewise use npm for Claude Inbox (publishing under `@anthropic-ai/claude-inbox`, for example). The official docs instruct users to install via `npm install -g @anthropic-ai/claude-code`, and warned against using `sudo`. We’ll adopt npm (or Yarn) for consistency.  _Note:_ a known issue was raised when using pnpm for global installs, so recommending npm or Yarn (which wraps npm) avoids auto-update problems.

**Use of React (Ink) & State Management:** Claude Code’s interface is built with React components via Ink. That implies using **React state/hooks** for UI state (chat log, modes, animations, etc.) and possibly React Context for shared state. For Claude Inbox, likewise we would use Ink/React: e.g. a `<Chat/>` component to display messages, a hook to manage conversation state, etc. Any global state (current conversation, config settings) can live in React context or a state manager. There’s no evidence Claude Code uses Redux or similar – instead it relies on React’s own state and context given the event-driven CLI flow. We’ll follow that pattern (e.g. use `useState`/`useEffect` and perhaps `useContext`) to manage the chat and tool workflows.

**Validation & Logging:** Claude Code uses the **Zod** library for data validation (e.g. parsing config or command arguments) and **Sentry** for error logging. We should include Zod for any CLI or input schema validation in Claude Inbox. Similarly, integrate Sentry (or another logger) to capture errors. This aligns with Claude Code’s stack and helps with reliability and debugging.

**Claude Code SDK Integration:** Claude Code provides an official **TypeScript SDK** as part of its NPM package. The CLI itself likely uses that SDK internally (the NPM package exports a `query()` function for Node). For Claude Inbox, we should import and use the same SDK (`import { query } from "@anthropic-ai/claude-code"`) or invoke the CLI as a subprocess, mirroring what Claude Code does. This ensures compatibility with Anthropic’s tooling and allows easy updates. In practice, we’ll rely on `@anthropic-ai/claude-code` under the hood for communication with Claude models, just like Claude Code does.

**File Structure and Tool Organization:** Claude Code’s (decompiled) source is highly modular. We should mimic a similar structure. For example:

- **`src/cli.ts`** – entry point, sets up Commander and Ink root.
    
- **`src/commands/`** – modules for each slash command or mode (e.g. `/read`, `/search`, `/email`), including handlers.
    
- **`src/terminal/`** – Ink UI components (e.g. input prompt, chat view, loading spinners).
    
- **`src/fileops/`** – functions to read/write files, manage state (e.g. persisting inbox state).
    
- **`src/ai/`** – code invoking the Claude SDK (client, system prompts, parsing responses).
    
- **`src/config/`** – config defaults and schema (using Zod) for settings.
    
- **`src/utils/`**, **`src/errors/`**, **`src/logger/`**, **`src/auth/`** – support modules (logging, error handling, auth).
    

The decompiled outline shows directories for CLI parsing (`cli.ts`), codebase analysis (`codebase/scan.ts`), commands (`commands/handlers/*.ts`), AI context (`ai/client.ts`), file operations (`fileops/reader.ts`), execution (`execution/shell.ts`), etc.. Claude Inbox will not need all of those (e.g. codebase indexer), but should organize similarly: separate concerns for parsing emails, managing context, formatting output, etc. Tool orchestration in Claude Code uses async loops and the MCP framework (Model Context Protocol) to call external tools like grep or git. For email triage, we’d incorporate similar calls (IMAP/SMTP, or shell tools for mail, possibly leveraging MCP as needed).

**Platform Compatibility & Developer Experience:** Since Claude Code targets macOS (and Linux/WSL), our stack (Node, Ink, Commander) is cross-platform and works well in macOS Terminal or iTerm. We should test on macOS 10.15+ and recommend using a modern shell (bash/zsh/fish). For dev setup, include a `.devcontainer` or similar (as Claude Code does) and editor configs. Use TypeScript compiler and bundler (e.g. Webpack or plain TS build) as needed. Follow Node best practices (ESLint/Prettier, typed config files, scripts in `package.json`). Use local installs (no `sudo`) and enable auto-update checks as Claude Code does (users call `claude doctor`).

**Differences for Claude Inbox:** We aim to mirror Claude Code’s stack as closely as possible. Any differences would be due to domain needs. For example, Claude Inbox might interact with mail servers (so we’d include an IMAP library), but we would still expose those as “tools” in the CLI (like the existing ‘Read’/’Write’ tools) rather than altering the core stack. The only major alternative approach could be using a different TUI framework (e.g. `blessed`), but that would deviate from Claude Code. Instead, staying with React/Ink keeps the behavior familiar and leverages the same dev experience. We’ll keep the package management and runtime identical (npm, Node) to avoid update or compatibility issues. If any strong reason arose (e.g. pnpm preventing auto-update), we’d document it, but otherwise we follow Claude Code’s choices.

**Summary:** For Claude Inbox, we recommend a **Node.js + TypeScript** stack using **Commander** for CLI parsing, **Ink (React)** for the terminal UI, **npm** for packaging, and the same ancillary libraries (Zod, Sentry, etc.) that Claude Code uses. We will integrate the official `@anthropic-ai/claude-code` SDK for agent calls. This aligns closely with Claude Code’s design, ensuring consistency and maintainability on macOS and other systems.

**Sources:** Our recommendations are based on Claude Code’s published docs and teardown analyses. These confirm the use of TypeScript, Node, Commander, Ink, Zod, Sentry, and npm in the existing Claude Code implementation. We adopt the same stack for Claude Inbox to mirror its interface and behavior.