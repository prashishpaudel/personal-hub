import { NextResponse } from "next/server";
import { fetchAllFeeds } from "@/lib/rss";

// In-memory cache (per server instance). Resets on cold start — fine for personal use.
let cache: { data: Awaited<ReturnType<typeof fetchAllFeeds>>; ts: number } | null =
  null;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const now = Date.now();

  if (cache && now - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { items: cache.data, cached: true, cachedAt: new Date(cache.ts).toISOString() },
      { headers: { "Cache-Control": "public, max-age=600" } }
    );
  }

  const items = await fetchAllFeeds();
  cache = { data: items, ts: now };

  return NextResponse.json(
    { items, cached: false, cachedAt: new Date(now).toISOString() },
    { headers: { "Cache-Control": "public, max-age=600" } }
  );
}
