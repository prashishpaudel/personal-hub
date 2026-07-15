// Client-side cache for media items, mirroring lib/feedStore. Keeps the
// Media tab from flickering through a loading state on every navigation.

export type MediaType = "youtube" | "spotify" | "apple-podcast";
export type MediaRow = {
  id: string;
  type: MediaType;
  url: string;
  title: string | null;
  is_course: boolean;
  section_id: string | null;
};

export type MediaSection = {
  id: string;
  name: string;
};

const TTL_MS = 5 * 60 * 1000;
const SS_KEY = "personal-hub:media-cache";

type Cache = { items: MediaRow[]; ts: number } | null;
let cache: Cache = null;

function hydrate() {
  if (cache || typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) cache = JSON.parse(raw) as { items: MediaRow[]; ts: number };
  } catch {
    /* ignore */
  }
}

export function getMediaCache(): { items: MediaRow[]; fresh: boolean } | null {
  hydrate();
  if (!cache) return null;
  return { items: cache.items, fresh: Date.now() - cache.ts < TTL_MS };
}

export function setMediaCache(items: MediaRow[]) {
  cache = { items, ts: Date.now() };
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(cache));
  } catch {
    /* ignore */
  }
}
