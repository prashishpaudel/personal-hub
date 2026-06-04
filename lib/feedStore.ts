// Client-side feed cache + UI state that persists across in-app navigation.
// Module state lives for the life of the SPA session, so moving Garden → Feed
// → Garden does not refetch. Also mirrored to sessionStorage to survive a
// full page reload within the same tab.

export type FeedItem = {
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

export type FeedUI = {
  filter: string; // "All" | category | "Saved"
  source: string | null; // active source filter
  selectedLink: string | null;
};

const TTL_MS = 10 * 60 * 1000;
const SS_KEY = "personal-hub:feed-cache";
const FAVS_KEY = "personal-hub:feed-favs";

type Cache = { items: FeedItem[]; ts: number } | null;

let cache: Cache = null;
let ui: FeedUI = { filter: "All", source: null, selectedLink: null };
const articleCache = new Map<string, string>();

function hydrateFromSession() {
  if (cache || typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { items: FeedItem[]; ts: number };
      if (parsed.items?.length) cache = parsed;
    }
  } catch {
    /* ignore */
  }
}

export function getFeedCache(): { items: FeedItem[]; ts: number; fresh: boolean } | null {
  hydrateFromSession();
  if (!cache) return null;
  return { ...cache, fresh: Date.now() - cache.ts < TTL_MS };
}

export function setFeedCache(items: FeedItem[]) {
  cache = { items, ts: Date.now() };
  try {
    // Drop heavy fullContent before persisting — it can exceed the ~5MB
    // sessionStorage quota. The reader fetches full text on demand anyway;
    // fullContent stays available in the in-memory cache for this session.
    const light = items.map((i) => ({ ...i, fullContent: null }));
    sessionStorage.setItem(SS_KEY, JSON.stringify({ items: light, ts: cache.ts }));
  } catch {
    /* quota / unavailable — keep in-memory only */
  }
}

export function getFeedUI(): FeedUI {
  return ui;
}

export function setFeedUI(next: Partial<FeedUI>) {
  ui = { ...ui, ...next };
}

export function getCachedArticle(link: string): string | undefined {
  return articleCache.get(link);
}

export function setCachedArticle(link: string, html: string) {
  articleCache.set(link, html);
}

// Favorites ("Saved") — keyed by article link, persisted to localStorage.
export function loadFavs(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVS_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

export function saveFavs(favs: Set<string>) {
  try {
    localStorage.setItem(FAVS_KEY, JSON.stringify([...favs]));
  } catch {
    /* ignore */
  }
}
