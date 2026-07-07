"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  Loader2,
  DownloadCloud,
  Play,
  Check,
  ChevronDown,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  mediaItems as defaultMedia,
  youtubeEmbedUrl,
  spotifyEmbedUrl,
  applePodcastEmbedUrl,
  youtubePlaylistId,
} from "@/lib/media";
import {
  getMediaCache,
  setMediaCache,
  type MediaRow as Item,
  type MediaType,
} from "@/lib/mediaStore";
import {
  listLessons,
  setLessonWatched,
  expandPlaylist,
  type Lesson,
} from "@/lib/courseStore";

function embedSrc(item: { type: MediaType; url: string }): string {
  if (item.type === "youtube") return youtubeEmbedUrl(item.url);
  if (item.type === "spotify") return spotifyEmbedUrl(item.url);
  return applePodcastEmbedUrl(item.url);
}

type Tab = "courses" | "videos" | "podcasts";

const emptyCopy: Record<Tab, string> = {
  courses: "No courses yet — add a YouTube playlist and tick “Track as course”.",
  videos: "No videos yet.",
  podcasts: "No podcasts yet.",
};

export default function MediaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<MediaType>("youtube");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [asCourse, setAsCourse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("media_items")
      .select("id,type,url,title,is_course")
      .order("created_at", { ascending: false });
    const rows = (data as Item[]) ?? [];
    setItems(rows);
    setMediaCache(rows);
    setLoading(false);
    const courseIds = rows.filter((r) => r.is_course).map((r) => r.id);
    if (courseIds.length > 0) {
      try {
        setLessons(await listLessons(courseIds));
      } catch {
        /* lessons unavailable — course still shows the player */
      }
    } else {
      setLessons([]);
    }
  }, []);

  // Show the cached list instantly to avoid a flash, then refresh (which also
  // pulls course lessons, not covered by the cache).
  useEffect(() => {
    const cached = getMediaCache();
    if (cached) {
      setItems(cached.items);
      setLoading(false);
    }
    load();
  }, [load]);

  const playlistId = useMemo(
    () => (type === "youtube" ? youtubePlaylistId(url) : null),
    [type, url]
  );

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !url.trim()) return;
    setBusy(true);
    setError("");
    const makeCourse = asCourse && !!playlistId;
    const { data, error } = await supabase
      .from("media_items")
      .insert({
        type,
        url: url.trim(),
        title: title.trim() || null,
        is_course: makeCourse,
      })
      .select("id")
      .single();
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    // Expand the playlist into lessons. If it fails, the item stays as a plain
    // playlist embed rather than blocking the add.
    if (makeCourse && data && playlistId) {
      try {
        await expandPlaylist(data.id as string, playlistId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Couldn't load playlist videos."
        );
      }
    }
    setBusy(false);
    setUrl("");
    setTitle("");
    setAsCourse(false);
    await load();
  }

  async function removeItem(id: string) {
    if (!supabase) return;
    const item = items.find((i) => i.id === id);
    const label = item?.title ? `"${item.title}"` : "this item";
    if (!window.confirm(`Delete ${label}? This can't be undone.`)) return;
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

  const courses = items.filter((i) => i.type === "youtube" && i.is_course);
  const videos = items.filter((i) => i.type === "youtube" && !i.is_course);
  const audio = items.filter((i) => i.type !== "youtube");

  const [tab, setTab] = useState<Tab>("courses");
  const tabPicked = useRef(false);

  // Land on the first non-empty tab until the user picks one themselves.
  useEffect(() => {
    if (tabPicked.current || loading) return;
    if (courses.length) setTab("courses");
    else if (videos.length) setTab("videos");
    else if (audio.length) setTab("podcasts");
  }, [loading, courses.length, videos.length, audio.length]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "courses", label: "Courses", count: courses.length },
    { key: "videos", label: "Videos", count: videos.length },
    { key: "podcasts", label: "Podcasts", count: audio.length },
  ];

  const lessonsByCourse = useMemo(() => {
    const map = new Map<string, Lesson[]>();
    for (const l of lessons) {
      const arr = map.get(l.media_id) ?? [];
      arr.push(l);
      map.set(l.media_id, arr);
    }
    return map;
  }, [lessons]);

  async function toggleLesson(id: string, watched: boolean) {
    setLessons((cur) =>
      cur.map((l) => (l.id === id ? { ...l, watched } : l))
    );
    try {
      await setLessonWatched(id, watched);
    } catch {
      setLessons((cur) =>
        cur.map((l) => (l.id === id ? { ...l, watched: !watched } : l))
      );
    }
  }

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
        {playlistId && (
          <label className="flex shrink-0 items-center gap-2 px-1 text-sm text-text-muted">
            <input
              type="checkbox"
              checked={asCourse}
              onChange={(e) => setAsCourse(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Track as course
          </label>
        )}
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Add
        </button>
      </form>
      {error && <p className="-mt-6 text-xs text-accent-text">{error}</p>}

      {!loading &&
        items.length > 0 &&
        (() => {
          const missing = defaultMedia.filter(
            (m) => !items.some((i) => i.url === m.url)
          ).length;
          if (missing === 0) return null;
          return (
            <button
              onClick={importDefaults}
              disabled={busy}
              className="flex items-center gap-2 self-start rounded-xl border border-dashed border-border px-4 py-2 text-sm font-medium text-text-muted hover:bg-bg-sunken disabled:opacity-50"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <DownloadCloud size={15} />
              )}
              Import {missing} new default{missing === 1 ? "" : "s"}
            </button>
          );
        })()}

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
        <div className="space-y-5">
          <div className="flex gap-1 rounded-xl border border-border bg-bg-sunken/50 p-1">
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    tabPicked.current = true;
                    setTab(t.key);
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-accent text-white shadow-sm"
                      : "text-text-muted hover:bg-bg-sunken hover:text-text"
                  }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span
                      className={`text-xs tabular-nums ${
                        active ? "text-white/70" : "text-text-faint"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {tab === "courses" ? (
            courses.length > 0 ? (
              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                {courses.map((item) => (
                  <CourseCard
                    key={item.id}
                    item={item}
                    lessons={lessonsByCourse.get(item.id) ?? []}
                    onToggle={toggleLesson}
                    onRemove={removeItem}
                  />
                ))}
              </div>
            ) : (
              <EmptyTab tab="courses" />
            )
          ) : tab === "videos" ? (
            videos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {videos.map((item) => (
                  <MediaCard key={item.id} item={item} onRemove={removeItem} />
                ))}
              </div>
            ) : (
              <EmptyTab tab="videos" />
            )
          ) : audio.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {audio.map((item) => (
                <MediaCard key={item.id} item={item} onRemove={removeItem} audio />
              ))}
            </div>
          ) : (
            <EmptyTab tab="podcasts" />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyTab({ tab }: { tab: Tab }) {
  return (
    <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
      <Play size={26} className="text-text-faint" />
      <p className="text-sm">{emptyCopy[tab]}</p>
    </div>
  );
}

function CourseCard({
  item,
  lessons,
  onToggle,
  onRemove,
}: {
  item: Item;
  lessons: Lesson[];
  onToggle: (id: string, watched: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const listId = youtubePlaylistId(item.url);
  const watched = lessons.filter((l) => l.watched).length;
  const total = lessons.length;
  const pct = total ? Math.round((watched / total) * 100) : 0;

  // Start on the first unwatched lesson, falling back to the first.
  const initial =
    lessons.find((l) => !l.watched)?.video_id ?? lessons[0]?.video_id ?? null;
  const [active, setActive] = useState<string | null>(initial);
  const [open, setOpen] = useState(false);
  const videoId = active ?? initial;

  const src =
    videoId && listId
      ? `https://www.youtube.com/embed/${videoId}?list=${listId}`
      : embedSrc(item);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-elevated">
      <div className="aspect-video">
        <iframe
          src={src}
          title={item.title ?? "Course"}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.title || "Course"}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          aria-label="Remove"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-sunken hover:text-accent-text"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {total > 0 && (
        <>
          <div className="px-3 pb-2">
            <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
              <span>
                {watched} / {total} watched
              </span>
              <span className="tabular-nums text-text-faint">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-sunken">
              <div
                className="h-full rounded-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex w-full items-center justify-between border-t border-border px-3 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
          >
            Lessons
            <ChevronDown
              size={15}
              className={`transition-transform ${open ? "" : "-rotate-90"}`}
            />
          </button>

          {open && (
            <ul className="max-h-64 overflow-y-auto border-t border-border">
              {lessons.map((l, i) => {
              const isActive = videoId === l.video_id;
              return (
                <li
                  key={l.id}
                  className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                    isActive ? "bg-bg-sunken" : ""
                  }`}
                >
                  <button
                    onClick={() => onToggle(l.id, !l.watched)}
                    aria-label={l.watched ? "Mark unwatched" : "Mark watched"}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      l.watched
                        ? "border-accent bg-accent text-white"
                        : "border-border-strong text-transparent hover:border-accent"
                    }`}
                  >
                    <Check size={13} />
                  </button>
                  <button
                    onClick={() => setActive(l.video_id)}
                    className="flex min-w-0 flex-1 items-baseline gap-1.5 text-left"
                  >
                    <span className="shrink-0 text-xs tabular-nums text-text-faint">
                      {i + 1}.
                    </span>
                    <span
                      className={`truncate ${
                        l.watched ? "text-text-faint line-through" : ""
                      }`}
                    >
                      {l.title}
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
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
    <div className="overflow-hidden rounded-2xl border border-border bg-bg-elevated">
      {audio ? (
        <iframe
          src={embedSrc(item)}
          title={item.title ?? "Podcast"}
          loading="lazy"
          allow="autoplay; encrypted-media"
          className="h-[175px] w-full"
        />
      ) : (
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
      )}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">
          {item.title || (audio ? "Podcast" : "Video")}
        </p>
        <button
          onClick={() => onRemove(item.id)}
          aria-label="Remove"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-bg-sunken hover:text-accent-text"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
