# Claude Inbox Agent Instructions

This directory contains the agent configuration for Claude Inbox email assistant.

## Agent Architecture

- **Subagents** are located in `agents/` subdirectory
- **Subagent selection guide** is at `agents/CLAUDE.md`
- **Working directory** for agent operations is this `.claude/` directory

## Important Notes

- When agents run, they operate from this directory as their working directory (cwd)
- The main application CLAUDE.md in the root is for developer documentation
- This README provides runtime context for the AI agents
