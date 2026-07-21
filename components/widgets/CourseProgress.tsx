"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import WidgetCard from "./WidgetCard";

type Course = { id: string; title: string | null };
type Row = { id: string; title: string; watched: number; total: number };

export default function CourseProgress() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        return;
      }
      const { data: courses, error } = await supabase
        .from("media_items")
        .select("id,title")
        .eq("is_course", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (error || !courses?.length) {
        setRows([]);
        setStatus(error ? "error" : "idle");
        return;
      }
      const ids = (courses as Course[]).map((c) => c.id);
      const { data: lessons } = await supabase
        .from("media_lessons")
        .select("media_id,watched")
        .in("media_id", ids);
      const byCourse = new Map<string, { watched: number; total: number }>();
      for (const l of (lessons ?? []) as { media_id: string; watched: boolean }[]) {
        const c = byCourse.get(l.media_id) ?? { watched: 0, total: 0 };
        c.total += 1;
        if (l.watched) c.watched += 1;
        byCourse.set(l.media_id, c);
      }
      setRows(
        (courses as Course[]).map((c) => ({
          id: c.id,
          title: c.title || "Course",
          watched: byCourse.get(c.id)?.watched ?? 0,
          total: byCourse.get(c.id)?.total ?? 0,
        }))
      );
      setStatus("idle");
    }
    load();
  }, []);

  if (status === "idle" && rows.length === 0) return null;

  return (
    <WidgetCard icon={Play} title="Courses" href="/media">
      {status === "loading" ? (
        <p className="py-4 text-sm text-text-muted">Loading…</p>
      ) : status === "error" ? (
        <p className="py-4 text-sm text-text-muted">Couldn&apos;t load courses.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const pct = c.total ? Math.round((c.watched / c.total) * 100) : 0;
            return (
              <li key={c.id}>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{c.title}</span>
                  <span className="shrink-0 text-xs tabular-nums text-text-faint">
                    {c.watched}/{c.total}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
}
