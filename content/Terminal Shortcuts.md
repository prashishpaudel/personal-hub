---
title: Terminal Shortcuts
date: 2026-06-22
tags: [terminal, shell, cli, macos, linux]
---

# Terminal Shortcuts

Keyboard shortcuts for moving the cursor and editing the command line. These are Emacs-style bindings (mixed with classic Unix terminal keys) and work in the default shell.

## Moving the cursor

| Shortcut | Action |
|----------|--------|
| `Ctrl + A` | Jump to start of line |
| `Ctrl + E` | Jump to end of line |
| `Ctrl + N` | Move down a line (or down through history) |
| `Ctrl + P` | Move up a line (or up through history) |
| `Option + ←` | Move back one word |
| `Option + →` | Move forward one word |
| `Esc` then `F` | Move forward one word (works without Option-as-Meta) |
| `Esc` then `B` | Move back one word (works without Option-as-Meta) |

## Deleting

| Shortcut | Action |
|----------|--------|
| `Ctrl + U` | Delete from cursor **back** to start of line |
| `Ctrl + K` | Delete from cursor **forward** to end of line |
| `Ctrl + W` | Delete the word before the cursor |
| `Ctrl + Y` | Paste back whatever you last deleted (U, K, or W) |

**Delete the whole line:** `Ctrl + E` then `Ctrl + U` (jump to end, then wipe backward).

## New line within a command

| Shortcut | Action |
|----------|--------|
| `\` then `Enter` | Continue the command on the next line |
| `Ctrl + V` then `Ctrl + J` | Insert a literal newline |

## What the letters mean

- **K = Kill** — "killing" is the Emacs word for deleting; killed text goes to a buffer you paste back with **Y (Yank)**.
- **U** — not a mnemonic; it's the old Unix terminal "kill line" key (see `stty`, where it's listed as `kill`).
- **N = Next**, **P = Previous**, **F = Forward**, **B = Backward**, **A** = start, **E** = End.

## Setup note

In **Terminal.app**, if `Option + ←/→` prints garbage like `[D` instead of jumping by word, go to **Terminal → Settings → Profiles → Keyboard** and enable **"Use Option as Meta key."** In **iTerm2** it usually works out of the box.
