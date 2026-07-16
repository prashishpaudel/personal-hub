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
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Globe,
  GripVertical,
  BookOpen,
  Cpu,
  Lightbulb,
  FlaskConical,
  Layers,
  DollarSign,
  ChevronDown,
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
} from "@/lib/feedStore";
import { listSaved, addSaved, removeSaved } from "@/lib/savedStore";
import {
  listSites,
  addSite,
  removeSite,
  updateSitePosition,
  type Site,
} from "@/lib/siteStore";
import { useDialog } from "@/components/DialogProvider";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

// One drag-sortable row in the Sites library.
function SiteRow({
  site,
  onDelete,
}: {
  site: Site;
  onDelete: (site: Site) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: site.id });
  const domain = new URL(site.url).hostname.replace(/^www\./, "");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-bg-sunken ${
        isDragging ? "z-10 bg-bg-elevated opacity-80 shadow-lg" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag"
        className="sticky-ctl flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <a
        href={site.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <Favicon domain={domain} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{site.name}</span>
          <span className="block truncate text-[11px] text-text-faint">
            {domain}
          </span>
        </span>
        <ExternalLink
          size={13}
          className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      </a>
      <button
        onClick={() => onDelete(site)}
        aria-label="Remove site"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-faint opacity-0 transition-opacity hover:text-accent-text group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

const categoryIcons: Record<string, LucideIcon> = {
  Tech: Cpu,
  World: Globe,
  Ideas: Lightbulb,
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
  const { confirm } = useDialog();
  const siteSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );
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
  const [savedItems, setSavedItems] = useState<FeedItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [siteUrl, setSiteUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [siteError, setSiteError] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Quick lookup of which links are saved, for the bookmark toggle state.
  const favs = useMemo(
    () => new Set(savedItems.map((i) => i.link)),
    [savedItems]
  );

  function toggleCat(cat: string) {
    setExpandedCats((cur) => {
      const next = new Set(cur);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

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
    listSaved()
      .then(setSavedItems)
      .catch(() => {
        /* bookmarks unavailable — feed still works */
      });
    listSites()
      .then(setSites)
      .catch(() => {
        /* sites unavailable — feed still works */
      });
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
    closeReader();
    setFilter(cat);
    setSource(null);
    setFeedUI({ filter: cat, source: null });
    setDrawerOpen(false);
  }

  function pickSource(src: string) {
    closeReader();
    setSource(src);
    setFilter("All");
    setFeedUI({ filter: "All", source: src });
    setDrawerOpen(false);
  }

  async function toggleFav(item: FeedItem) {
    const wasSaved = favs.has(item.link);
    if (wasSaved) {
      const ok = await confirm({
        title: "Unsave article",
        message: `Remove "${item.title}" from saved?`,
        confirmLabel: "Unsave",
      });
      if (!ok) return;
    }
    // Optimistic: update the list now, reconcile with Supabase after.
    setSavedItems((cur) =>
      wasSaved
        ? cur.filter((i) => i.link !== item.link)
        : [item, ...cur.filter((i) => i.link !== item.link)]
    );
    try {
      if (wasSaved) await removeSaved(item.link);
      else await addSaved(item);
    } catch {
      // Revert on failure.
      setSavedItems((cur) =>
        wasSaved
          ? [item, ...cur.filter((i) => i.link !== item.link)]
          : cur.filter((i) => i.link !== item.link)
      );
    }
  }

  // Bookmark a site (no RSS needed) for revisiting later.
  async function submitSite(e: React.FormEvent) {
    e.preventDefault();
    const raw = siteUrl.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let host: string;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      setSiteError("Enter a valid URL.");
      return;
    }
    if (sites.some((s) => s.url === url)) {
      setSiteError("Already saved.");
      return;
    }
    setSiteError(null);
    try {
      const top = sites.length
        ? Math.min(...sites.map((s) => s.position)) - 1
        : 0;
      const site = await addSite(siteName.trim() || host, url, top);
      setSites((cur) => [site, ...cur]);
      setSiteUrl("");
      setSiteName("");
    } catch (err) {
      setSiteError(err instanceof Error ? err.message : "Couldn't save site.");
    }
  }

  function onSiteDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sites.findIndex((s) => s.id === active.id);
    const to = sites.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(sites, from, to);
    const prev = next[to - 1]?.position;
    const after = next[to + 1]?.position;
    let position: number;
    if (prev === undefined && after === undefined) position = 0;
    else if (prev === undefined) position = after! - 1;
    else if (after === undefined) position = prev + 1;
    else position = (prev + after) / 2;
    next[to] = { ...next[to], position };
    setSites(next);
    updateSitePosition(String(active.id), position).catch(() => {});
  }

  async function deleteSite(site: Site) {
    const ok = await confirm({
      title: "Remove site",
      message: `Remove "${site.name}" from your sites?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setSites((cur) => cur.filter((s) => s.id !== site.id));
    removeSite(site.id).catch(() => {});
  }

  // Save an arbitrary article URL to the reading list. Extracts a title +
  // excerpt via the same Readability route the reader uses, then stores a
  // snapshot like any other saved article.
  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    const raw = linkUrl.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let host: string;
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      setLinkError("Enter a valid URL.");
      return;
    }
    if (favs.has(url)) {
      setLinkError("Already saved.");
      return;
    }
    setAddingLink(true);
    setLinkError(null);
    try {
      const res = await fetch(`/api/article?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      const item: FeedItem = {
        title: (res.ok && json.title?.trim()) || host,
        link: url,
        date: new Date().toISOString(),
        source: host,
        sourceDomain: host,
        category: "",
        summary: (res.ok && json.excerpt?.trim()) || "",
        fullContent: null,
        image: null,
      };
      setSavedItems((cur) => [item, ...cur.filter((i) => i.link !== url)]);
      await addSaved(item);
      setLinkUrl("");
      setFilter("Saved");
      setSource(null);
      setFeedUI({ filter: "Saved", source: null });
    } catch {
      setSavedItems((cur) => cur.filter((i) => i.link !== url));
      setLinkError("Couldn't save that link.");
    } finally {
      setAddingLink(false);
    }
  }

  // Sources grouped under their category for the accordion sidebar.
  // Within a category, sources are ordered by their freshest article so the
  // most recently active feed sits on top.
  const sourceGroups = useMemo(() => {
    const byCat = new Map<
      string,
      Map<string, { domain: string; latest: number }>
    >();
    for (const i of items) {
      if (!byCat.has(i.category)) byCat.set(i.category, new Map());
      const m = byCat.get(i.category)!;
      const t = new Date(i.date).getTime();
      const existing = m.get(i.source);
      if (!existing) m.set(i.source, { domain: i.sourceDomain, latest: t });
      else if (t > existing.latest) existing.latest = t;
    }
    return [...byCat.entries()]
      .map(([category, m]) => ({
        category,
        sources: [...m.entries()]
          .sort((a, b) => b[1].latest - a[1].latest)
          .map(([name, v]) => [name, v.domain] as [string, string]),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    // Saved view reads from the stored snapshots so bookmarks still render
    // after an article ages out of its source feed.
    const base = filter === "Saved" ? savedItems : items;
    return base.filter((item) => {
      if (filter !== "Saved" && filter !== "All" && item.category !== filter) {
        return false;
      }
      if (source && item.source !== source) return false;
      if (q && !`${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [items, savedItems, filter, source, search]);

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
          <button
            onClick={() => pickCategory("Sites")}
            className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors ${
              filter === "Sites"
                ? "bg-accent-soft text-accent-text"
                : "text-text-muted hover:bg-bg-sunken hover:text-text"
            }`}
          >
            <span className="flex items-center gap-2">
              <Globe size={16} /> Sites
            </span>
            {sites.length > 0 && (
              <span className="text-[11px] tabular-nums text-text-faint">
                {sites.length}
              </span>
            )}
          </button>
        </div>

        <div>
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-text-faint">
            Browse
          </p>
          <div className="space-y-0.5">
            <button
              onClick={() => pickCategory("All")}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                !source && filter === "All"
                  ? "bg-accent-soft text-accent-text"
                  : "text-text-muted hover:bg-bg-sunken hover:text-text"
              }`}
            >
              <Layers size={16} className="shrink-0" /> All
            </button>

            {sourceGroups.map(({ category, sources }) => {
              const open = expandedCats.has(category);
              const catActive = !source && filter === category;
              return (
                <div key={category}>
                  <div
                    className={`flex items-center rounded-lg transition-colors ${
                      catActive
                        ? "bg-accent-soft text-accent-text"
                        : "text-text-muted hover:bg-bg-sunken hover:text-text"
                    }`}
                  >
                    <button
                      onClick={() => pickCategory(category)}
                      className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left text-sm"
                    >
                      <CategoryIcon category={category} />
                      {category}
                    </button>
                    <button
                      onClick={() => toggleCat(category)}
                      aria-label={`Toggle ${category} sources`}
                      className="flex h-8 w-7 items-center justify-center rounded-lg hover:text-text"
                    >
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${open ? "rotate-180" : ""}`}
                      />
                    </button>
                  </div>

                  {open && (
                    <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {sources.map(([name, domain]) => (
                        <button
                          key={name}
                          onClick={() => pickSource(name)}
                          className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[13px] transition-colors ${
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
                  )}
                </div>
              );
            })}
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

        <label
          className={`${
            filter === "Sites" ? "hidden" : "flex"
          } items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong`}
        >
          <Search size={15} className="text-text-faint" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>

        {filter === "Saved" && (
          <form onSubmit={addLink} className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
              <Plus size={15} className="shrink-0 text-text-faint" />
              <input
                value={linkUrl}
                onChange={(e) => {
                  setLinkUrl(e.target.value);
                  if (linkError) setLinkError(null);
                }}
                placeholder="Paste an article link to save"
                className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
              />
              {linkUrl.trim() && (
                <button
                  type="submit"
                  disabled={addingLink}
                  className="shrink-0 rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {addingLink ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    "Save"
                  )}
                </button>
              )}
            </div>
            {linkError && (
              <p className="px-1 text-xs text-red-400">{linkError}</p>
            )}
          </form>
        )}

        {filter === "Sites" && (
          <form onSubmit={submitSite} className="space-y-1.5">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
              <Plus size={15} className="shrink-0 text-text-faint" />
              <input
                value={siteUrl}
                onChange={(e) => {
                  setSiteUrl(e.target.value);
                  if (siteError) setSiteError(null);
                }}
                placeholder="Site URL"
                className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
              />
              <input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Name (optional)"
                className="w-28 shrink-0 border-l border-border pl-2 bg-transparent text-sm outline-none placeholder:text-text-faint"
              />
              {siteUrl.trim() && (
                <button
                  type="submit"
                  className="shrink-0 cursor-pointer rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
                >
                  Save
                </button>
              )}
            </div>
            {siteError && (
              <p className="px-1 text-xs text-red-400">{siteError}</p>
            )}
          </form>
        )}

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {filter === "Sites" ? (
            sites.length === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-text-muted">
                No sites yet — save one above.
              </p>
            ) : (
              <DndContext
                sensors={siteSensors}
                collisionDetection={closestCenter}
                onDragEnd={onSiteDragEnd}
              >
                <SortableContext
                  items={sites.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sites.map((site) => (
                    <SiteRow key={site.id} site={site} onDelete={deleteSite} />
                  ))}
                </SortableContext>
              </DndContext>
            )
          ) : status === "loading" ? (
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
                  onClick={() => toggleFav(selected)}
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
