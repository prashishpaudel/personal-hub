"use client";

import {
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  Loader2,
  Newspaper,
  Settings2,
  ListFilter,
  Bookmark,
  BookmarkCheck,
  X,
  Search,
  Maximize2,
  Minimize2,
  Globe,
  BookOpen,
  Cpu,
  Lightbulb,
  BarChart2,
  FlaskConical,
  Layers,
  DollarSign,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { sanitizeHtml } from "@/lib/sanitize";
import ManageSources from "@/components/ManageSources";
import {
  type FeedItem,
  getFeedCache,
  setFeedCache,
  getFeedUI,
  setFeedUI,
  getCachedArticle,
  setCachedArticle,
  loadFavs,
  saveFavs,
} from "@/lib/feedStore";

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

function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Globe size={16} className="h-4 w-4 shrink-0 text-text-faint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 rounded"
      onError={() => setFailed(true)}
    />
  );
}

const categoryIcons: Record<string, LucideIcon> = {
  Tech: Cpu,
  Ideas: Lightbulb,
  Politics: BarChart2,
  Science: FlaskConical,
  Finance: DollarSign,
  All: Layers,
  Saved: Bookmark,
};

function CategoryIcon({ category }: { category: string }) {
  const Icon = categoryIcons[category] ?? BookOpen;
  return <Icon size={16} className="shrink-0" />;
}

export default function FeedPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  const [source, setSource] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<FeedItem | null>(null);
  const [fetchedContent, setFetchedContent] = useState<string | null>(null);
  const [fetchingArticle, setFetchingArticle] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "reader">("list");
  const [manageOpen, setManageOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState(false);

  const closeReader = useCallback(() => {
    setSelected(null);
    setExpanded(false);
    setFetchedContent(null);
    setMobileView("list");
    setFeedUI({ selectedLink: null });
  }, []);

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    try {
      const res = await fetch(refresh ? "/api/feed?fresh=1" : "/api/feed");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      const next: FeedItem[] = json.items ?? [];
      setItems(next);
      setFeedCache(next);
      setStatus("idle");
    } catch {
      setStatus((s) => (s === "loading" ? "error" : s));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Mount: restore from the client cache instantly; only fetch if missing/stale.
  useEffect(() => {
    setFavs(loadFavs());
    const ui = getFeedUI();
    setFilter(ui.filter);
    setSource(ui.source);

    const cached = getFeedCache();
    if (cached) {
      setItems(cached.items);
      setStatus("idle");
      if (ui.selectedLink) {
        const item = cached.items.find((i) => i.link === ui.selectedLink) ?? null;
        if (item) setSelected(item);
      }
      if (!cached.fresh) loadFeed(true); // background refresh
    } else {
      loadFeed();
    }
  }, [loadFeed]);

  // Esc: collapse expanded reader, else close drawer, else close reader.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (expanded) setExpanded(false);
      else if (drawerOpen) setDrawerOpen(false);
      else if (selected) closeReader();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [expanded, drawerOpen, selected, closeReader]);

  // Open an article — show the feed's own content by default (fast). The
  // full readable extraction is fetched on demand via "Read in app".
  const openArticle = useCallback((item: FeedItem) => {
    setSelected(item);
    setExpanded(false);
    setFeedUI({ selectedLink: item.link });
    setFetchError(null);
    setFetchingArticle(false);
    setFetchedContent(null);
    setMobileView("reader");
  }, []);

  // Toggle the Mozilla Readability extraction (/api/article). Click once to
  // fetch + show the parsed article, click again to return to feed content.
  const toggleReadInApp = useCallback(async () => {
    if (!selected) return;
    if (fetchedContent) {
      setFetchedContent(null);
      return;
    }
    const cached = getCachedArticle(selected.link);
    if (cached) {
      setFetchedContent(cached);
      return;
    }
    setFetchingArticle(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/article?url=${encodeURIComponent(selected.link)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setFetchedContent(json.content);
      setCachedArticle(selected.link, json.content);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load article");
    } finally {
      setFetchingArticle(false);
    }
  }, [selected, fetchedContent]);

  function pickCategory(cat: string) {
    setFilter(cat);
    setSource(null);
    setFeedUI({ filter: cat, source: null });
    setDrawerOpen(false);
  }

  function pickSource(src: string) {
    setSource(src);
    setFilter("All");
    setFeedUI({ filter: "All", source: src });
    setDrawerOpen(false);
  }

  function toggleFav(link: string) {
    setFavs((cur) => {
      const next = new Set(cur);
      if (next.has(link)) next.delete(link);
      else next.add(link);
      saveFavs(next);
      return next;
    });
  }

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(items.map((i) => i.category))).sort()],
    [items]
  );

  const sources = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of items) if (!map.has(i.source)) map.set(i.source, i.sourceDomain);
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "Saved") {
        if (!favs.has(item.link)) return false;
      } else if (filter !== "All" && item.category !== filter) {
        return false;
      }
      if (source && item.source !== source) return false;
      if (q && !`${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, filter, source, search, favs]);

  const activeLabel = source ?? (filter === "All" ? "All sources" : filter);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 overflow-y-auto p-3">
        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Library
          </p>
          <button
            onClick={() => pickCategory("Saved")}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
              filter === "Saved"
                ? "bg-accent-soft text-accent-text"
                : "text-text-muted hover:bg-bg-sunken hover:text-text"
            }`}
          >
            <span className="flex items-center gap-2">
              <Bookmark size={16} /> Saved
            </span>
            {favs.size > 0 && (
              <span className="text-[11px] tabular-nums text-text-faint">
                {favs.size}
              </span>
            )}
          </button>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Category
          </p>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => pickCategory(cat)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  !source && filter === cat
                    ? "bg-accent-soft text-accent-text"
                    : "text-text-muted hover:bg-bg-sunken hover:text-text"
                }`}
              >
                <CategoryIcon category={cat} />
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Sources
          </p>
          <div className="space-y-0.5">
            {sources.map(([name, domain]) => (
              <button
                key={name}
                onClick={() => pickSource(name)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  source === name
                    ? "bg-accent-soft text-accent-text"
                    : "text-text-muted hover:bg-bg-sunken hover:text-text"
                }`}
              >
                <Favicon domain={domain} />
                <span className="truncate">{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border p-3">
        <button
          onClick={() => setManageOpen(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-text"
        >
          <Settings2 size={15} /> Manage
        </button>
        <button
          onClick={() => loadFeed(true)}
          aria-label="Refresh"
          className="text-text-muted hover:text-text"
        >
          <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] gap-4 md:h-[calc(100dvh-4.5rem)]">
      {/* Sources sidebar — desktop */}
      <aside className="hidden w-48 shrink-0 rounded-2xl border border-border bg-bg-elevated lg:block">
        {sidebar}
      </aside>

      {/* Mobile / tablet drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-bg-elevated">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="text-sm font-semibold">Filters</span>
              <button onClick={() => setDrawerOpen(false)} aria-label="Close">
                <X size={18} className="text-text-muted" />
              </button>
            </div>
            <div className="h-[calc(100%-46px)]">{sidebar}</div>
          </div>
        </div>
      )}

      {/* List pane */}
      <aside
        className={`${
          mobileView === "reader" ? "hidden" : "flex"
        } w-full flex-col gap-3 md:flex md:w-80 md:shrink-0`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Filters"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-bg-sunken lg:hidden"
          >
            <ListFilter size={16} />
          </button>
          <h1 className="flex-1 truncate font-display text-xl font-semibold tracking-tight">
            {activeLabel}
          </h1>
          <button
            onClick={() => loadFeed(true)}
            aria-label="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border text-text-muted hover:bg-bg-sunken lg:hidden"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
          <Search size={15} className="text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {status === "loading" ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" /> Loading feeds
            </div>
          ) : status === "error" ? (
            <p className="px-3 py-10 text-center text-sm text-text-muted">
              Couldn&apos;t load feeds.{" "}
              <button onClick={() => loadFeed()} className="text-accent-text underline">
                Retry
              </button>
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-text-muted">
              {filter === "Saved" ? "No saved articles yet." : "Nothing here."}
            </p>
          ) : (
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
                    <Favicon domain={item.sourceDomain} />
                    <span className="truncate font-medium text-text-muted">
                      {item.source}
                    </span>
                    <span>·</span>
                    <span className="shrink-0">{timeAgo(item.date)}</span>
                    {item.fullContent && (
                      <BookOpen size={11} className="shrink-0" aria-label="Full text" />
                    )}
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
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                )}
              </button>
            ))
          )}

          {status === "idle" && filtered.length > 0 && (
            <p className="py-3 text-center text-[11px] tabular-nums text-text-faint">
              {filtered.length} posts
            </p>
          )}
        </div>
      </aside>

      {/* Reader pane */}
      <section
        className={
          selected && expanded
            ? "fixed inset-0 z-40 flex flex-col bg-bg-elevated"
            : `${
                mobileView === "list" ? "hidden" : "flex"
              } flex-1 flex-col rounded-2xl border border-border bg-bg-elevated md:flex`
        }
      >
        {selected ? (
          <>
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <button
                onClick={() => setMobileView("list")}
                className="flex items-center gap-1 text-sm text-text-muted md:hidden"
              >
                <ChevronLeft size={18} /> Back
              </button>
              <span className="hidden truncate text-xs text-text-muted md:block">
                {selected.source}
              </span>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={toggleReadInApp}
                  disabled={fetchingArticle}
                  aria-label={fetchedContent ? "Show feed content" : "Read in app"}
                  title={fetchedContent ? "Show feed content" : "Read full article in app"}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg-sunken disabled:opacity-50 ${
                    fetchedContent
                      ? "text-accent-text"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  <BookOpen size={16} className={fetchingArticle ? "animate-pulse" : ""} />
                </button>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  aria-label={expanded ? "Collapse" : "Expand"}
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken hover:text-text md:flex"
                >
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button
                  onClick={() => toggleFav(selected.link)}
                  aria-label="Save"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken hover:text-accent-text"
                >
                  {favs.has(selected.link) ? (
                    <BookmarkCheck size={16} className="text-accent-text" />
                  ) : (
                    <Bookmark size={16} />
                  )}
                </button>
                <a
                  href={selected.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open original"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken hover:text-accent-text"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={closeReader}
                  aria-label="Close"
                  className="hidden h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken hover:text-text md:flex"
                >
                  <X size={16} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
              <div className="mx-auto max-w-[680px]">
                <p className="mb-2 text-xs font-medium text-text-faint">
                  {selected.source} · {timeAgo(selected.date)}
                </p>
                <h1 className="mb-6 font-display text-2xl font-semibold leading-tight tracking-tight md:text-3xl">
                  {selected.title}
                </h1>

                {/* Priority: parsed article → feed full content → fallback */}
                {fetchedContent ? (
                  <div
                    className="prose-reader"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(fetchedContent) }}
                  />
                ) : selected.fullContent ? (
                  <div
                    className="prose-reader"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(selected.fullContent),
                    }}
                  />
                ) : fetchingArticle ? (
                  <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
                    <Loader2 size={16} className="animate-spin" /> Fetching article…
                  </div>
                ) : (
                  <div>
                    {selected.summary && (
                      <p className="mb-6 leading-relaxed text-text-muted">
                        {selected.summary}
                      </p>
                    )}
                    {fetchError ? (
                      <p className="mb-4 text-sm text-text-faint">
                        Couldn&apos;t fetch full text — read it at the source.
                      </p>
                    ) : (
                      <p className="mb-4 inline-flex items-center gap-1 text-sm text-text-faint">
                        Tap{" "}
                        <BookOpen size={13} className="inline-block align-text-bottom" />{" "}
                        above to read the full article in app.
                      </p>
                    )}
                    <div>
                      <a
                        href={selected.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Read original <ExternalLink size={15} />
                      </a>
                    </div>
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
