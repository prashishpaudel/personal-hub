---
title: Claude Code Tips
date: 2026-05-09
tags: [claude, tools]
---

# Claude Code Tips

## Session Management

- `claude --resume` — browse, pick, and resume past sessions
- `/resume` — same as `claude --resume` but from inside a session
- `/clear` — discard the current conversation and context
- `/context` — visualize current context usage

## Keyboard Shortcuts

- `SHIFT + TAB` — enable plan mode
- `CTRL + R` — search prompt history. Press again to cycle through results.
  Press `Tab` to select a prompt or `Enter` to run it directly

## Useful Commands

- `/compact` — compress context while preserving key discussions
  - Example: `/compact Focus on preserving our authentication refactoring discussion. The database work is complete and can be summarized briefly.`
- `/insights` — generate a web page showing everything about Claude Code usage

## Caveman Mode

- `/caveman` — enable caveman mode (simple, direct responses)
- `/caveman lite` — lighter version
- `/caveman full` — full version
- `/caveman ultra` — ultra version
- `stop caveman` — disable caveman mode

## Progress Tracking

Use this prompt to summarize progress:
> Let's summarize where we are. What have we accomplished, what's the current state, and what are our next steps? Put this in progress.md

## Important Plugins

1. **Superpowers** — brainstorming and dispatching parallel agents
2. **Context7** — MCP Server for up-to-date documentation lookup

## File Locations

- Project history: `~/.claude/projects/` — delete folders here to remove session history