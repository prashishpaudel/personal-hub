"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search, FileText } from "lucide-react";
import type { NoteMeta } from "@/lib/garden";

export default function GardenSearch({ notes }: { notes: NoteMeta[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) =>
      `${n.title} ${n.tags.join(" ")} ${n.excerpt}`.toLowerCase().includes(q)
    );
  }, [notes, query]);

  return (
    <div className="space-y-5">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered.map((note) => (
            <Link
              key={note.slug}
              href={`/garden/${note.slug}`}
              className="group flex flex-col gap-2 rounded-2xl border border-border bg-bg-elevated p-4 transition-all hover:border-border-strong hover:shadow-sm"
            >
              <div className="flex items-center gap-2 text-text-faint">
                <FileText size={16} />
                <h2 className="text-[15px] font-semibold tracking-tight text-text">
                  {note.title}
                </h2>
              </div>
              {note.excerpt && (
                <p className="line-clamp-2 text-sm text-text-muted">
                  {note.excerpt}
                </p>
              )}
              {note.tags.length > 0 && (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-bg-sunken px-2 py-0.5 text-[11px] text-text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
