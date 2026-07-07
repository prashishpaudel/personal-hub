import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Lesson = { videoId: string; title: string; position: number };

// Expand a YouTube playlist into its videos via the Data API. Costs 1 quota
// unit per 50 videos. Requires YOUTUBE_API_KEY in the environment.
export async function GET(request: Request) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "YOUTUBE_API_KEY is not set." },
      { status: 500 }
    );
  }

  const listId = new URL(request.url).searchParams.get("list");
  if (!listId) {
    return NextResponse.json({ error: "Missing playlist id" }, { status: 400 });
  }

  const lessons: Lesson[] = [];
  let pageToken = "";

  try {
    do {
      const api = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      api.searchParams.set("part", "snippet,contentDetails");
      api.searchParams.set("maxResults", "50");
      api.searchParams.set("playlistId", listId);
      api.searchParams.set("key", key);
      if (pageToken) api.searchParams.set("pageToken", pageToken);

      const res = await fetch(api, { signal: AbortSignal.timeout(15_000) });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.error?.message || `HTTP ${res.status}`;
        return NextResponse.json({ error: msg }, { status: 502 });
      }

      for (const it of json.items ?? []) {
        const videoId = it.contentDetails?.videoId as string | undefined;
        const title = (it.snippet?.title as string) ?? "";
        const position = (it.snippet?.position as number) ?? lessons.length;
        if (!videoId || title === "Deleted video" || title === "Private video") {
          continue;
        }
        lessons.push({ videoId, title, position });
      }
      pageToken = (json.nextPageToken as string) ?? "";
    } while (pageToken);

    if (lessons.length === 0) {
      return NextResponse.json(
        { error: "No public videos found in that playlist." },
        { status: 422 }
      );
    }

    lessons.sort((a, b) => a.position - b.position);
    return NextResponse.json({ lessons });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch playlist";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
