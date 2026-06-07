"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { Compass, Search } from "lucide-react";
import type { NoteMeta } from "@/lib/garden";

// The index/MOC note (content/index.md) is the garden's entry point — pin it to
// the top with its own icon rather than listing it among the regular notes.
const HOME_SLUG = "index";

export default function GardenExplorer({ notes }: { notes: NoteMeta[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const home = useMemo(() => notes.find((n) => n.slug === HOME_SLUG), [notes]);
  const rest = useMemo(() => notes.filter((n) => n.slug !== HOME_SLUG), [notes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rest;
    return rest.filter((n) =>
      `${n.title} ${n.tags.join(" ")} ${n.excerpt}`.toLowerCase().includes(q)
    );
  }, [rest, query]);

  const isActive = (slug: string) => pathname === `/garden/${slug}`;

  const itemClass = (active: boolean) =>
    `block truncate rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
      active
        ? "bg-accent-soft font-medium text-accent-text"
        : "text-text-muted hover:bg-bg-sunken hover:text-text"
    }`;

  return (
    <aside className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-56 shrink-0 flex-col gap-3 self-start lg:flex">
      <p className="px-2.5 text-xs font-semibold uppercase tracking-wide text-text-faint">
        Explorer
      </p>

      <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
        <Search size={15} className="text-text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter notes"
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
        />
      </label>

      <nav className="-mr-1 flex flex-col gap-0.5 overflow-y-auto pr-1">
        {home && !query && (
          <Link
            href={`/garden/${home.slug}`}
            className={`mb-1 flex items-center gap-2 ${itemClass(isActive(home.slug))}`}
          >
            <Compass size={15} className="shrink-0" />
            <span className="truncate">{home.title}</span>
          </Link>
        )}

        {filtered.length === 0 ? (
          <p className="px-2.5 py-2 text-sm text-text-faint">No matches.</p>
        ) : (
          filtered.map((note) => (
            <Link
              key={note.slug}
              href={`/garden/${note.slug}`}
              className={itemClass(isActive(note.slug))}
            >
              {note.title}
            </Link>
          ))
        )}
      </nav>
    </aside>
  );
}
