"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StickyNote } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import WidgetCard from "./WidgetCard";

type Row = {
  id: string;
  body: string;
  kind: "text" | "list";
  items: { text: string; done: boolean }[];
  color: string;
};

function preview(row: Row): string {
  if (row.kind === "list") {
    const open = row.items.filter((i) => !i.done && i.text.trim());
    return open.length
      ? `☐ ${open[0].text}${open.length > 1 ? ` +${open.length - 1}` : ""}`
      : "All done";
  }
  return row.body.split("\n").find((l) => l.trim()) || "Empty note";
}

export default function RecentStickies() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        return;
      }
      const { data, error } = await supabase
        .from("sticky_notes")
        .select("id,body,kind,items,color")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(4);
      if (error) {
        setStatus("error");
        return;
      }
      setRows((data as Row[]) ?? []);
      setStatus("idle");
    }
    load();
  }, []);

  if (status === "idle" && rows.length === 0) return null;

  return (
    <WidgetCard icon={StickyNote} title="Stickies" href="/stickies">
      {status === "loading" ? (
        <p className="py-4 text-sm text-text-muted">Loading…</p>
      ) : status === "error" ? (
        <p className="py-4 text-sm text-text-muted">
          Couldn&apos;t load stickies.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href="/stickies"
                style={{ background: `var(--sticky-${s.color})` }}
                className="block truncate rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:border-border-strong"
              >
                {preview(s)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
