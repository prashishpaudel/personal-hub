import { NextResponse } from "next/server";
import { lookup } from "node:dns/promises";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { sanitizeHtml } from "@/lib/sanitize";

// Reject loopback, private, link-local, and other non-public addresses so a
// crafted ?url= can't make the server fetch internal services (SSRF).
function isPrivateAddress(ip: string): boolean {
  const v4 = ip.split(".").map(Number);
  if (v4.length === 4 && v4.every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    const [a, b] = v4;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  const v6 = ip.toLowerCase();
  if (v6 === "::1" || v6 === "::") return true;
  if (v6.startsWith("fe80") || v6.startsWith("fc") || v6.startsWith("fd")) return true;
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.replace("::ffff:", ""));
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  // Resolve the host and refuse private/internal targets.
  try {
    const { address } = await lookup(parsed.hostname);
    if (isPrivateAddress(address)) {
      return NextResponse.json({ error: "Blocked host" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Could not resolve host" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PersonalHub/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10_000),
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Fetch failed: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();
    const { document } = parseHTML(html);
    const reader = new Readability(document as unknown as Document);
    const article = reader.parse();

    if (!article?.content) {
      return NextResponse.json({ error: "Could not parse article" }, { status: 422 });
    }

    return NextResponse.json({
      title: article.title,
      content: sanitizeHtml(article.content),
      excerpt: article.excerpt,
      byline: article.byline,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
