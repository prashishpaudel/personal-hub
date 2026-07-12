"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PenLine, Plus, RotateCcw, Loader2, Trash2 } from "lucide-react";
import {
  createDraft,
  getBlogCache,
  hardDelete,
  listPosts,
  listTrash,
  restore,
  setBlogCache,
  type Post,
} from "@/lib/blogStore";
import { useDialog } from "@/components/DialogProvider";

type Tab = "published" | "drafts" | "trash";

function timeAgo(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ts);
}

// Plain-text preview from the stored editor HTML.
function excerpt(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function readingTime(html: string): string {
  const words = html.replace(/<[^>]*>/g, " ").trim().split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

const emptyCopy: Record<Tab, string> = {
  published: "Nothing published yet.",
  drafts: "No drafts — start writing.",
  trash: "Trash is empty.",
};

export default function BlogPage() {
  const router = useRouter();
  const { confirm } = useDialog();
  const [tab, setTab] = useState<Tab>("published");
  const [posts, setPosts] = useState<Post[]>([]);
  const [trash, setTrash] = useState<Post[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function load(hasCache = false) {
    try {
      const [active, deleted] = await Promise.all([listPosts(), listTrash()]);
      setPosts(active);
      setTrash(deleted);
      setStatus("idle");
    } catch (err) {
      if (!hasCache) {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load posts.");
      }
    }
  }

  useEffect(() => {
    // Render the cached lists instantly, then refresh in the background.
    const cached = getBlogCache();
    if (cached) {
      setPosts(cached.posts);
      setTrash(cached.trash);
      setStatus("idle");
    }
    load(!!cached);
  }, []);

  // Keep the cache in sync with the current lists.
  useEffect(() => {
    if (status === "idle") setBlogCache({ posts, trash });
  }, [status, posts, trash]);

  const visible = useMemo(() => {
    if (tab === "trash") return trash;
    return posts.filter((p) =>
      tab === "published" ? p.status === "published" : p.status === "draft"
    );
  }, [tab, posts, trash]);

  async function newPost() {
    setCreating(true);
    try {
      const post = await createDraft();
      router.push(`/blog/${post.id}/edit`);
    } catch (err) {
      setCreating(false);
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to create post.");
    }
  }

  async function restorePost(id: string) {
    try {
      await restore(id);
      await load();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to restore.");
    }
  }

  async function deleteForever(post: Post) {
    const name = post.title || "Untitled";
    const ok = await confirm({
      title: "Delete forever",
      message: `Permanently delete "${name}"? This cannot be undone.`,
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    try {
      await hardDelete(post.id);
      await load();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: "published",
      label: "Published",
      count: posts.filter((p) => p.status === "published").length,
    },
    {
      key: "drafts",
      label: "Drafts",
      count: posts.filter((p) => p.status === "draft").length,
    },
    { key: "trash", label: "Trash", count: trash.length },
  ];

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Blog
          </h1>
          <p className="text-sm text-text-muted">Long-form writing, private.</p>
        </div>
        <button
          onClick={newPost}
          disabled={creating}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {creating ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Plus size={15} />
          )}
          New post
        </button>
      </header>

      <div className="flex gap-1 rounded-xl border border-border bg-bg-sunken/50 p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
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

      {status === "loading" ? (
        <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : status === "error" ? (
        <p className="py-10 text-center text-sm text-text-muted">{message}</p>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
          <PenLine size={26} />
          <p className="text-sm">{emptyCopy[tab]}</p>
        </div>
      ) : tab === "trash" ? (
        <ul className="space-y-1">
          {visible.map((post) => (
            <li
              key={post.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-sunken"
            >
              <span className="min-w-0 flex-1 truncate text-[15px] text-text-muted">
                {post.title || "Untitled"}
              </span>
              <span className="shrink-0 text-xs text-text-faint">
                deleted {post.deletedAt ? timeAgo(post.deletedAt) : ""}
              </span>
              <button
                onClick={() => restorePost(post.id)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-text hover:bg-accent-soft"
              >
                <RotateCcw size={13} /> Restore
              </button>
              <button
                onClick={() => deleteForever(post)}
                title="Delete forever"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-bg-sunken"
              >
                <Trash2 size={13} /> Delete forever
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="divide-y divide-border">
          {visible.map((post) => {
            const preview = excerpt(post.contentHtml);
            return (
              <Link
                key={post.id}
                href={
                  post.status === "draft"
                    ? `/blog/${post.id}/edit`
                    : `/blog/${post.id}`
                }
                className="group block space-y-1.5 py-5 first:pt-2"
              >
                <div className="flex items-center gap-2 text-xs text-text-faint">
                  <span>
                    {post.status === "published" && post.publishedAt
                      ? timeAgo(post.publishedAt)
                      : `edited ${timeAgo(post.updatedAt)}`}
                  </span>
                  {preview && (
                    <>
                      <span>·</span>
                      <span>{readingTime(post.contentHtml)}</span>
                    </>
                  )}
                  {post.status === "draft" && (
                    <span className="rounded-full bg-bg-sunken px-2 py-0.5 text-[11px] text-text-muted">
                      draft
                    </span>
                  )}
                </div>
                <h2 className="font-display text-xl font-semibold tracking-tight transition-colors group-hover:text-accent-text">
                  {post.title || "Untitled"}
                </h2>
                {preview && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-text-muted">
                    {preview}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
