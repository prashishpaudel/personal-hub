"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";
import WidgetCard from "./WidgetCard";

type Row = { id: string; title: string; updated_at: string };

export default function RecentNotes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        return;
      }
      const { data, error } = await supabase
        .from("notes")
        .select("id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(5);
      if (error) {
        setStatus("error");
        return;
      }
      setRows(data ?? []);
      setStatus("idle");
    }
    load();
  }, []);

  return (
    <WidgetCard icon={NotebookPen} title="Recent notes" href="/notes">
      {status === "loading" ? (
        <p className="py-6 text-center text-sm text-text-faint">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-text-muted">No notes yet.</p>
          <Link
            href="/notes"
            className="mt-2 inline-block text-sm font-medium text-accent-text hover:underline"
          >
            Write one →
          </Link>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href="/notes"
                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-sunken"
              >
                <span className="truncate text-sm">
                  {row.title || "Untitled note"}
                </span>
                <span className="shrink-0 text-xs text-text-faint">
                  {timeAgo(row.updated_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
