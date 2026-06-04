"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rss } from "lucide-react";
import { timeAgo } from "@/lib/time";
import WidgetCard from "./WidgetCard";

type Item = { title: string; link: string; source: string; date: string };

export default function FeedHighlights() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/feed");
        const json = await res.json();
        if (!res.ok) throw new Error();
        setItems((json.items ?? []).slice(0, 6));
        setStatus("idle");
      } catch {
        setStatus("error");
      }
    }
    load();
  }, []);

  return (
    <WidgetCard icon={Rss} title="Latest in feed" href="/feed">
      {status === "loading" ? (
        <p className="py-6 text-center text-sm text-text-faint">Loading…</p>
      ) : status === "error" || items.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">
          Nothing to show.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={`${item.link}-${i}`}>
              <Link
                href="/feed"
                className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-bg-sunken"
              >
                <p className="truncate text-sm">{item.title}</p>
                <p className="text-xs text-text-faint">
                  {item.source} · {timeAgo(item.date)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
