import {
  mediaItems,
  youtubeEmbedUrl,
  spotifyEmbedUrl,
  applePodcastEmbedUrl,
} from "@/lib/media";

export const metadata = { title: "Media · Personal Hub" };

function embedSrc(item: (typeof mediaItems)[number]): string {
  if (item.type === "youtube") return youtubeEmbedUrl(item.url);
  if (item.type === "spotify") return spotifyEmbedUrl(item.url);
  return applePodcastEmbedUrl(item.url);
}

export default function MediaPage() {
  const videos = mediaItems.filter((m) => m.type === "youtube");
  const audio = mediaItems.filter((m) => m.type !== "youtube");

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-text-muted">Videos and podcasts worth keeping.</p>
      </header>

      {videos.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
            Videos
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {videos.map((item) => (
              <div
                key={item.url}
                className="overflow-hidden rounded-2xl border border-border bg-bg-elevated"
              >
                <div className="aspect-video">
                  <iframe
                    src={embedSrc(item)}
                    title={item.title ?? "Video"}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
                {item.title && (
                  <p className="px-4 py-3 text-sm font-medium">{item.title}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {audio.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
            Podcasts
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {audio.map((item) => (
              <div
                key={item.url}
                className="overflow-hidden rounded-2xl border border-border bg-bg-elevated"
              >
                <iframe
                  src={embedSrc(item)}
                  title={item.title ?? "Podcast"}
                  loading="lazy"
                  allow="autoplay; encrypted-media"
                  className="h-[175px] w-full"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
