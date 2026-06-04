"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, DownloadCloud, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  mediaItems as defaultMedia,
  youtubeEmbedUrl,
  spotifyEmbedUrl,
  applePodcastEmbedUrl,
} from "@/lib/media";
import {
  getMediaCache,
  setMediaCache,
  type MediaRow as Item,
  type MediaType,
} from "@/lib/mediaStore";

function embedSrc(item: { type: MediaType; url: string }): string {
  if (item.type === "youtube") return youtubeEmbedUrl(item.url);
  if (item.type === "spotify") return spotifyEmbedUrl(item.url);
  return applePodcastEmbedUrl(item.url);
}

export default function MediaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<MediaType>("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("media_items")
      .select("id,type,url,title")
      .order("created_at", { ascending: false });
    const rows = (data as Item[]) ?? [];
    setItems(rows);
    setMediaCache(rows);
    setLoading(false);
  }, []);

  // Show the cached list instantly; only hit the network if missing/stale.
  useEffect(() => {
    const cached = getMediaCache();
    if (cached) {
      setItems(cached.items);
      setLoading(false);
      if (cached.fresh) return;
    }
    load();
  }, [load]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !url.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase.from("media_items").insert({
      type,
      url: url.trim(),
      title: title.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setUrl("");
    setTitle("");
    await load();
  }

  async function removeItem(id: string) {
    if (!supabase) return;
    setItems((cur) => {
      const next = cur.filter((i) => i.id !== id);
      setMediaCache(next);
      return next;
    });
    await supabase.from("media_items").delete().eq("id", id);
  }

  async function importDefaults() {
    if (!supabase) return;
    setBusy(true);
    const existing = new Set(items.map((i) => i.url));
    const toAdd = defaultMedia
      .filter((m) => !existing.has(m.url))
      .map((m) => ({ type: m.type, url: m.url, title: m.title ?? null }));
    if (toAdd.length > 0) await supabase.from("media_items").insert(toAdd);
    setBusy(false);
    await load();
  }

  const videos = items.filter((i) => i.type === "youtube");
  const audio = items.filter((i) => i.type !== "youtube");

  return (
    <div className="space-y-8">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Media</h1>
        <p className="text-sm text-text-muted">Videos and podcasts worth keeping.</p>
      </header>

      {/* Add form */}
      <form
        onSubmit={addItem}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-bg-elevated p-4 sm:flex-row sm:items-center"
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value as MediaType)}
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
        >
          <option value="youtube">YouTube</option>
          <option value="apple-podcast">Apple Podcast</option>
          <option value="spotify">Spotify</option>
        </select>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste link"
          className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
        />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (optional)"
          className="rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong sm:w-44"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus size={16} /> Add
        </button>
      </form>
      {error && <p className="-mt-6 text-xs text-accent-text">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-bg-sunken/40 py-12 text-center">
          <Play size={28} className="text-text-faint" />
          <p className="text-sm text-text-muted">No media yet.</p>
          <button
            onClick={importDefaults}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-bg-sunken disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <DownloadCloud size={15} />
            )}
            Import {defaultMedia.length} defaults
          </button>
        </div>
      ) : (
        <>
          {videos.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-text-faint">
                Videos
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {videos.map((item) => (
                  <MediaCard key={item.id} item={item} onRemove={removeItem} />
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
                  <MediaCard key={item.id} item={item} onRemove={removeItem} audio />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function MediaCard({
  item,
  onRemove,
  audio = false,
}: {
  item: Item;
  onRemove: (id: string) => void;
  audio?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-bg-elevated">
      <button
        onClick={() => onRemove(item.id)}
        aria-label="Remove"
        className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-bg/80 text-text-muted opacity-0 backdrop-blur transition-opacity hover:text-accent-text group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
      {audio ? (
        <iframe
          src={embedSrc(item)}
          title={item.title ?? "Podcast"}
          loading="lazy"
          allow="autoplay; encrypted-media"
          className="h-[175px] w-full"
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
