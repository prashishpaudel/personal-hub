import { NextResponse } from "next/server";
import { fetchAllFeeds, type FeedItem } from "@/lib/rss";
import { sources as defaultSources, type RSSSource } from "@/lib/sources";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-server";

// In-memory cache (per server instance). Resets on cold start — fine for personal use.
let cache: { data: FeedItem[]; ts: number } | null = null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Live sources from the user's DB; fall back to bundled defaults if none yet.
async function resolveSources(): Promise<RSSSource[]> {
  if (!isSupabaseConfigured) return defaultSources;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("rss_sources")
      .select("name,url,category");
    if (data && data.length > 0) return data as RSSSource[];
  } catch {
    // fall through to defaults
  }
  return defaultSources;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fresh = searchParams.get("fresh") === "1";
  const now = Date.now();

  if (!fresh && cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { items: cache.data, cached: true, cachedAt: new Date(cache.ts).toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const items = await fetchAllFeeds(await resolveSources());
  cache = { data: items, ts: now };

  return NextResponse.json(
    { items, cached: false, cachedAt: new Date(now).toISOString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
