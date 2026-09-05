"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import type { NoteMeta } from "@/lib/garden";

function formatDate(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(d);
}

// Obsidian-style file list: the garden's landing view. Opening a note replaces
// this list with the note itself, which carries a back link here.
export default function GardenList({ notes }: { notes: NoteMeta[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      `${n.title} ${n.excerpt}`.toLowerCase().includes(q)
    );
  }, [notes, query]);

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
