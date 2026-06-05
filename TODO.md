# Personal Hub — TODO

Tracking remaining work. Phases 1–4 (shell, auth, notes, garden, feed, media,
dashboard widgets) are done and deployed.

## Now
- [x] Manage RSS feeds from the UI (add / remove) — DB-backed
- [x] Add media links from the UI (add / remove) — DB-backed

## Next
- [ ] Custom SMTP (Resend) — remove Supabase magic-link email rate limit
- [ ] 301 redirects: old `notes.` / `rss.` subdomains → hub
- [ ] Archive the 3 old repos (personal-notepad, personal-memex, rss-aggregator)

## Notes
- [ ] Support pasted code as readable code blocks without wrapping unrelated text
- [ ] Add lightweight writing formatting (numbered lists, bullet lists)
- [ ] Add password-protected notes

## Polish / later
- [ ] Garden: tag filter + tag pages
- [ ] Garden: graph view (skipped in Phase 4)
- [ ] Feed: per-item read / saved state
- [ ] Notes: realtime sync across tabs (Supabase realtime)
- [ ] Dashboard: surface garden backlinks / counts
- [ ] PWA / installable mobile app
