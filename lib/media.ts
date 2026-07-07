export type MediaItem = {
  type: "youtube" | "spotify" | "apple-podcast";
  url: string;
  title?: string;
};

// Add videos and podcasts here.
export const mediaItems: MediaItem[] = [
  { type: "youtube", url: "https://www.youtube.com/watch?v=mYDGPyYqvUU" },
  { type: "youtube", url: "https://www.youtube.com/watch?v=wm-hqM9F8BM" },
  { type: "youtube", url: "https://www.youtube.com/watch?v=hp6n1qwo1Ws" },
  {
    type: "apple-podcast",
    url: "https://podcasts.apple.com/us/podcast/the-wisdom-of-the-right-timing-taoism/id1831764919?i=1000743679174",
    title: "The Wisdom of the Right Timing — Taoism",
  },
  {
    type: "apple-podcast",
    url: "https://podcasts.apple.com/us/podcast/4-the-illusion-of-the-ego/id1071578260?i=1000361317746",
    title: "The illusion of the ego",
  },
];

export function youtubeEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    const list = u.searchParams.get("list");
    const id =
      u.hostname === "youtu.be" ? u.pathname.slice(1) : u.searchParams.get("v");

    if (id) {
      const base = `https://www.youtube.com/embed/${id}`;
      return list ? `${base}?list=${list}` : base;
    }
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
  } catch {
    // fall through
  }
  return url;
}

export function spotifyEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (!u.pathname.startsWith("/embed")) {
      return `https://open.spotify.com/embed${u.pathname}`;
    }
  } catch {
    // fall through
  }
  return url;
}

export function applePodcastEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    return `https://embed.podcasts.apple.com${u.pathname}${u.search}`;
  } catch {
    // fall through
  }
  return url;
}
