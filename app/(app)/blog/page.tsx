"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PenLine, Plus, RotateCcw, Loader2 } from "lucide-react";
import {
  createDraft,
  listPosts,
  listTrash,
  restore,
  type Post,
} from "@/lib/blogStore";

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

const emptyCopy: Record<Tab, string> = {
  published: "Nothing published yet.",
  drafts: "No drafts — start writing.",
  trash: "Trash is empty.",
};

export default function BlogPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("published");
  const [posts, setPosts] = useState<Post[]>([]);
  const [trash, setTrash] = useState<Post[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    try {
      const [active, deleted] = await Promise.all([listPosts(), listTrash()]);
      setPosts(active);
      setTrash(deleted);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load posts.");
    }
  }

  useEffect(() => {
    load();
  }, []);

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

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.key
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1.5 text-xs text-text-faint">{t.count}</span>
            )}
          </button>
        ))}
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
      ) : (
        <ul className="space-y-1">
          {visible.map((post) => (
            <li
              key={post.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-bg-sunken"
            >
              {tab === "trash" ? (
                <>
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
                </>
              ) : (
                <>
                  <Link
                    href={
                      post.status === "draft"
                        ? `/blog/${post.id}/edit`
                        : `/blog/${post.id}`
                    }
                    className="min-w-0 flex-1 truncate text-[15px] font-medium"
                  >
                    {post.title || "Untitled"}
                  </Link>
                  {post.status === "draft" && (
                    <span className="shrink-0 rounded-full bg-bg-sunken px-2 py-0.5 text-[11px] text-text-muted">
                      draft
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-text-faint">
                    {timeAgo(post.updatedAt)}
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
