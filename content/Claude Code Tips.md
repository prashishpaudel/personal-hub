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

## Custom Slash Commands

A Markdown file becomes a command — the filename is the command name.

- `.claude/commands/` — project commands, shared through the repo
- `~/.claude/commands/` — personal commands, available in every project
- `.claude/commands/review.md` → `/review`
- `.claude/commands/git/sync.md` → `/git:sync` — a subfolder namespaces the command
- `$ARGUMENTS` — everything typed after the command, as one string
- `$1`, `$2`, … — arguments in the order you type them
- Frontmatter (all optional): `description`, `argument-hint`, `allowed-tools`, `model`

Typing:

```text
/deploy staging v2.1
```

gives:

```text
$1 → staging
$2 → v2.1
```

Example — `.claude/commands/deploy.md`:

```markdown
---
description: Deploy a version to an environment
argument-hint: <environment> <version>
---

Deploy version $2 to $1. Run the test suite first, then report the result.
```

## Subagents

A separate Claude with its own context window and system prompt. Good for wide searches
whose file dumps you don't want filling the main conversation — only the final report
comes back.

- `.claude/agents/` — project subagents, shared through the repo
- `~/.claude/agents/` — personal subagents, available in every project
- One Markdown file per agent; the body is its system prompt
- Frontmatter: `name` and `description` required, `tools` and `model` optional
- `description` is what Claude matches on when picking an agent — phrase it as "use when …"
- Omit `tools` to inherit every tool; list them to narrow what the agent can do
- Ask by name ("use the code-reviewer subagent") or let Claude delegate on its own
- The `/agents` wizard is gone — create and edit the files directly

Example — `.claude/agents/code-reviewer.md`:

```markdown
---
name: code-reviewer
description: Use after writing code to review it for bugs and unclear naming.
tools: Read, Grep, Glob, Bash
model: sonnet
---

Review the diff for correctness bugs first, then clarity.
Report each finding as `file:line` with a one-line fix.
```

Built-ins worth knowing: `Explore` (read-only fan-out search), `Plan` (implementation
plans), `general-purpose`.

## Hooks

Shell commands the harness runs automatically at fixed points. Deterministic — unlike
asking Claude to remember a rule.

- `/hooks` — configure interactively
- Live in `settings.json` (user, project, or local) under `hooks`
- Events: `SessionStart`, `UserPromptSubmit`, `PreToolUse` (can block), `PostToolUse`, `Stop`, `Notification`
- `matcher` filters by tool name (`Edit|Write`, `Bash`) — omit it for events with no tool
- The hook gets the event as JSON on stdin; exit `2` blocks the action and sends stderr back to Claude

Example — format every file Claude writes:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## Important Plugins

1. **Superpowers** — brainstorming and dispatching parallel agents
2. **Context7** — MCP Server for up-to-date documentation lookup
3. **mattpocock/skills** — grilling a plan, specs and tickets, TDD, code review
4. **Caveman** — ultra-compressed replies, ~75% fewer output tokens (see below)

## Installing Skills: Plugin vs Copy

- **Plugin** — installs once, available in **every project**; auto-updates, but read-only
  so you can't tweak a skill

  ```bash
  claude plugins install mattpocock-skills
  ```

- **Copy** — writes into **the current repo only**; yours to edit, re-run to update

  ```bash
  npx skills@latest add mattpocock/skills
  ```

- Copies land in `.claude/skills/`; put them in `~/.claude/skills/` to reuse everywhere
- Either way, loaded on the next session start
- Plugin skills are namespaced (`mattpocock:code-review`) — no clash with built-ins

## Caveman Mode

- `/caveman` — enable caveman mode (simple, direct responses)
- `/caveman lite` — lighter version
- `/caveman full` — full version
- `/caveman ultra` — ultra version
- `stop caveman` — disable caveman mode

## Progress Tracking

Use this prompt to summarize progress:
> Let's summarize where we are. What have we accomplished, what's the current state, and what are our next steps? Put this in progress.md

## File Locations

- Project history: `~/.claude/projects/` — delete folders here to remove session history
