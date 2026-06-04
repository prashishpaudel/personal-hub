"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Rss } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { getFeedCache, setFeedCache, type FeedItem } from "@/lib/feedStore";
import WidgetCard from "./WidgetCard";

export default function FeedHighlights() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    // Reuse the shared feed cache so the dashboard and /feed don't refetch
    // each other; only hit the network when the cache is missing/stale.
    const cached = getFeedCache();
    if (cached) {
      setItems(cached.items.slice(0, 6));
      setStatus("idle");
      if (cached.fresh) return;
    }
    async function load() {
      try {
        const res = await fetch("/api/feed");
        const json = await res.json();
        if (!res.ok) throw new Error();
        const next: FeedItem[] = json.items ?? [];
        setFeedCache(next);
        setItems(next.slice(0, 6));
        setStatus("idle");
      } catch {
        setStatus((s) => (s === "loading" ? "error" : s));
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
