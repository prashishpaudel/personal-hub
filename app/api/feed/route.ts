import { NextResponse } from "next/server";
import { fetchAllFeeds, type FeedItem } from "@/lib/rss";
import { sources as defaultSources, type RSSSource } from "@/lib/sources";
import { createClient, isSupabaseConfigured } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60; // fetching many feeds can take a while

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

  try {
    const items = await fetchAllFeeds(await resolveSources());
    cache = { data: items, ts: now };

    return NextResponse.json(
      { items, cached: false, cachedAt: new Date(now).toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load feeds";
    console.error("[api/feed]", message);
    // Serve stale cache if we have any, otherwise surface the error.
    if (cache) {
      return NextResponse.json(
        { items: cache.data, cached: true, stale: true },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json({ items: [], error: message }, { status: 500 });
  }
}
