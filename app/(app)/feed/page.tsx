"use client";

import {
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Newspaper,
  Settings2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { categories, type Category } from "@/lib/sources";
import ManageSources from "@/components/ManageSources";

type FeedItem = {
  title: string;
  link: string;
  date: string;
  source: string;
  sourceDomain: string;
  category: string;
  summary: string;
  fullContent: string | null;
  image: string | null;
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
    new Date(date)
  );
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Category | "All">("All");
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "reader">("list");
  const [manageOpen, setManageOpen] = useState(false);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setStatus("loading");
    try {
      const res = await fetch(refresh ? "/api/feed?fresh=1" : "/api/feed");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setItems(json.items ?? []);
      setStatus("idle");
    } catch {
      setStatus("error");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const filtered = useMemo(
    () => (filter === "All" ? items : items.filter((i) => i.category === filter)),
    [items, filter]
  );

  const openArticle = useCallback(async (item: FeedItem) => {
    setSelected(item);
    setFetchedContent(null);
    setFetchError(null);
    setMobileView("reader");
    setFetchingArticle(true);
    try {
      const res = await fetch(`/api/article?url=${encodeURIComponent(item.link)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setFetchedContent(json.content);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setFetchingArticle(false);
    }
  }, []);

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] gap-4 md:h-[calc(100dvh-4.5rem)]">
      {/* List pane */}
      <aside
        className={`${
          mobileView === "reader" ? "hidden" : "flex"
        } w-full flex-col gap-3 md:flex md:w-80 md:shrink-0`}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight">Feed</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setManageOpen(true)}
              aria-label="Manage feeds"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-bg-sunken"
            >
              <Settings2 size={16} />
            </button>
            <button
              onClick={() => loadFeed(true)}
              aria-label="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-bg-sunken"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(["All", ...categories] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filter === cat
                  ? "bg-accent text-white"
                  : "bg-bg-sunken text-text-muted hover:text-text"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {status === "loading" && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" /> Loading feeds
            </div>
          )}
          {status === "error" && (
            <p className="px-3 py-10 text-center text-sm text-text-muted">
              Couldn&apos;t load feeds.{" "}
              <button onClick={() => loadFeed()} className="text-accent-text underline">
                Retry
              </button>
            </p>
          )}
          {status === "idle" &&
            filtered.map((item, i) => (
              <button
                key={`${item.link}-${i}`}
                onClick={() => openArticle(item)}
                className={`flex w-full gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  selected?.link === item.link
                    ? "border-border-strong bg-bg-elevated"
                    : "border-transparent hover:bg-bg-sunken"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-text-faint">
                    <span className="truncate font-medium text-text-muted">
                      {item.source}
                    </span>
                    <span>·</span>
                    <span className="shrink-0">{timeAgo(item.date)}</span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm font-medium">
                    {item.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">
                    {item.summary}
                  </p>
                </div>
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt=""
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-lg object-cover"
                  />
                )}
              </button>
            ))}
        </div>
      </aside>

      {/* Reader pane */}
      <section
        className={`${
          mobileView === "list" ? "hidden" : "flex"
        } flex-1 flex-col rounded-2xl border border-border bg-bg-elevated md:flex`}
      >
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1 text-sm text-text-muted md:hidden"
              >
                <ChevronLeft size={18} /> Feed
              </button>
              <span className="hidden truncate text-xs text-text-muted md:block">
                {selected.source}
              </span>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-accent-text"
              >
                Original <ExternalLink size={14} />
              </a>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
              <div className="mx-auto max-w-[680px]">
                <p className="mb-2 text-xs font-medium text-text-faint">
                  {selected.source} · {timeAgo(selected.date)}
                </p>
                <h1 className="mb-6 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                  {selected.title}
                </h1>

                {fetchingArticle ? (
                  <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
                    <Loader2 size={16} className="animate-spin" /> Loading article
                  </div>
                ) : fetchedContent ? (
                  <div
                    className="prose-reader"
                    dangerouslySetInnerHTML={{ __html: fetchedContent }}
                  />
                ) : selected.fullContent ? (
                  <div
                    className="prose-reader"
                    dangerouslySetInnerHTML={{ __html: selected.fullContent }}
                  />
                ) : (
                  <div>
                    {selected.summary && (
                      <p className="mb-6 leading-relaxed text-text-muted">
                        {selected.summary}
                      </p>
                    )}
                    {fetchError && (
                      <p className="mb-4 text-sm text-text-faint">
                        Full text unavailable — read it at the source.
                      </p>
                    )}
                    <a
                      href={selected.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
                    >
                      Read original <ExternalLink size={15} />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
            <Newspaper size={30} />
            <p className="text-sm">Pick an article to read</p>
          </div>
        )}
      </section>

      {manageOpen && (
        <ManageSources
          onClose={() => setManageOpen(false)}
          onChange={() => loadFeed(true)}
        />
      )}
    </div>
  );
}
