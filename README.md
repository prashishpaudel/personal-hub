# Personal Hub

A unified personal super-app — one space for notes, knowledge garden, RSS feeds, and media. Built with Next.js, replacing separate `personal-notepad`, `personal-memex`, and `rss-aggregator` sites.

## Sections

| Route | What |
|-------|------|
| `/` | Launcher dashboard — widgets across all sections |
| `/notes` | Notepad (Supabase) |
| `/garden` | Knowledge garden — Obsidian Markdown, wikilinks, backlinks, search |
| `/feed` | RSS reader |
| `/media` | YouTube / podcast embeds |

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- Supabase (single-user auth + data)
- Build-time Markdown pipeline for the garden (`content/` Obsidian vault)

## Develop

```bash
npm install
cp .env.example .env.local   # add Supabase keys
npm run dev
```

Open http://localhost:3000.
