import Parser from "rss-parser";
import { type RSSSource } from "./sources";
import { sanitizeHtml } from "./sanitize";

export interface FeedItem {
  title: string;
  link: string;
  date: string;
  source: string;
  sourceDomain: string;
  category: string;
  summary: string;
  // Full HTML content from feed (not all feeds provide this), sanitized.
  fullContent: string | null;
  // Hero image extracted from feed item.
  image: string | null;
}

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "PersonalHub/1.0",
    Accept: "application/rss+xml, application/xml, text/xml",
  },
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent"],
      ["media:thumbnail", "mediaThumbnail"],
    ],
  },
});

function extractImage(item: Record<string, unknown>): string | null {
  const enc = item.enclosure as { url?: string; type?: string } | undefined;
  if (enc?.url && enc.type?.startsWith("image/")) return enc.url;

  const mc = item.mediaContent as { $?: { url?: string }; url?: string } | undefined;
  const mcUrl = mc?.$?.url ?? mc?.url;
  if (mcUrl) return mcUrl;

  const mt = item.mediaThumbnail as { $?: { url?: string }; url?: string } | undefined;
  const mtUrl = mt?.$?.url ?? mt?.url;
  if (mtUrl) return mtUrl;

  const html = (item.contentEncoded as string) || (item.content as string) || "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (match?.[1]) return match[1];

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchFeed(source: RSSSource): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).slice(0, 30).map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      const rawFull = (raw.contentEncoded as string) || item.content || null;

      return {
        title: item.title?.trim() || "Untitled",
        link: item.link || item.guid || "",
        date: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        sourceDomain: new URL(source.url).hostname.replace("www.", ""),
        category: source.category,
        summary: stripHtml(
          item.contentSnippet || item.content || item.summary || ""
        ).slice(0, 300),
        fullContent: rawFull ? sanitizeHtml(rawFull) : null,
        image: extractImage(raw),
      };
    });
  } catch (err) {
    console.error(`[RSS] Failed ${source.name} (${source.url}):`, err);
    return [];
  }
}

// Fetch the given feeds in parallel, merge, sort newest first.
export async function fetchAllFeeds(sources: RSSSource[]): Promise<FeedItem[]> {
  const results = await Promise.all(sources.map(fetchFeed));
  return results
    .flat()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
