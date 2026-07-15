import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Look up a media item's real title so the add form can auto-fill it.
// YouTube videos + Spotify via public oEmbed (no key); YouTube playlists via
// the Data API when YOUTUBE_API_KEY is set.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("url");
  const type = searchParams.get("type");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  try {
    if (type === "youtube") {
      const list = url.searchParams.get("list");
      const videoId =
        url.hostname === "youtu.be"
          ? url.pathname.slice(1)
          : url.searchParams.get("v");

      if (videoId) {
        const title = await oembed(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${videoId}`
          )}&format=json`
        );
        return NextResponse.json({ title });
      }

      if (list && process.env.YOUTUBE_API_KEY) {
        const api = new URL("https://www.googleapis.com/youtube/v3/playlists");
        api.searchParams.set("part", "snippet");
        api.searchParams.set("id", list);
        api.searchParams.set("key", process.env.YOUTUBE_API_KEY);
        const res = await fetch(api, { signal: AbortSignal.timeout(8_000) });
        const json = await res.json();
        const title = json?.items?.[0]?.snippet?.title ?? null;
        return NextResponse.json({ title });
      }
      return NextResponse.json({ title: null });
    }

    if (type === "spotify") {
      const title = await oembed(
        `https://open.spotify.com/oembed?url=${encodeURIComponent(raw)}`
      );
      return NextResponse.json({ title });
    }

    // Apple Podcasts has no public oEmbed — nothing to auto-fill.
    return NextResponse.json({ title: null });
  } catch {
    return NextResponse.json({ title: null });
  }
}

async function oembed(endpoint: string): Promise<string | null> {
  const res = await fetch(endpoint, { signal: AbortSignal.timeout(8_000) });
  if (!res.ok) return null;
  const json = await res.json();
  return typeof json?.title === "string" ? json.title : null;
}
