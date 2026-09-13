"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpDown, Check, FileText, Search } from "lucide-react";
import type { NoteMeta } from "@/lib/garden";
import {
  getCachedPrefs,
  loadPrefs,
  savePref,
  type GardenSort,
} from "@/lib/prefsStore";

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  // Frontmatter dates are calendar days, not instants — format in UTC so an
  // ISO day never renders as the day before.
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(d);
}

// Obsidian-style file list: the garden's landing view. Opening a note replaces
// this list with the note itself, which carries a back link here.
const SORTS: { key: GardenSort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "name", label: "Name" },
];

export default function GardenList({ notes }: { notes: NoteMeta[] }) {
  const [query, setQuery] = useState("");
  // `notes` arrives newest-first from the server, so that is the default and
  // needs no re-sort. The saved preference is applied once it arrives.
  const [sort, setSort] = useState<GardenSort>(
    () => getCachedPrefs()?.gardenSort ?? "recent"
  );
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close the menu on an outside tap, same as the section menus elsewhere.
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!sortRef.current?.contains(e.target as Node)) setSortOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSortOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [sortOpen]);

  useEffect(() => {
    loadPrefs()
      .then((p) => setSort(p.gardenSort ?? "recent"))
      .catch(() => {
        /* prefs unavailable — the default order still works */
      });
  }, []);

  function pickSort(next: GardenSort) {
    setSort(next);
    setSortOpen(false);
    savePref("gardenSort", next).catch(() => {
      /* keep the local choice even if the write fails */
    });
  }

  const ordered = useMemo(
    () =>
      sort === "name"
        ? [...notes].sort((a, b) => a.title.localeCompare(b.title))
        : notes,
    [notes, sort]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((n) =>
      `${n.title} ${n.excerpt}`.toLowerCase().includes(q)
    );
  }, [ordered, query]);

  return (
    <div className="max-w-2xl space-y-5">
      <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3.5 py-2.5 focus-within:border-border-strong">
        <Search size={18} className="text-text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the garden"
          className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
        />
      </label>

      <div ref={sortRef} className="relative flex justify-end">
        <button
          onClick={() => setSortOpen((v) => !v)}
          aria-label="Sort notes"
          aria-haspopup="menu"
          aria-expanded={sortOpen}
          title={`Sorted by ${sort === "name" ? "name" : "recent"}`}
          className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors ${
            sortOpen
              ? "bg-bg-sunken text-text"
              : "text-text-faint hover:bg-bg-sunken hover:text-text-muted"
          }`}
        >
          <ArrowUpDown size={15} />
        </button>

        {sortOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg"
          >
            {SORTS.map((s) => (
              <button
                key={s.key}
                role="menuitemradio"
                aria-checked={sort === s.key}
                onClick={() => pickSort(s.key)}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-bg-sunken"
              >
                <Check
                  size={14}
                  className={`shrink-0 ${
                    sort === s.key ? "text-accent-text" : "text-transparent"
                  }`}
                />
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-muted">
          {notes.length === 0 ? "No notes yet." : "No matches."}
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-bg-elevated">
          {filtered.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/garden/${note.slug}`}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg-sunken"
              >
                <FileText size={16} className="shrink-0 text-text-faint" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {note.title}
                </span>
                {note.date && (
                  <span className="shrink-0 text-xs tabular-nums text-text-faint">
                    {formatDate(note.date)}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
