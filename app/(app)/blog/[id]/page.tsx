"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2, Pencil, Trash2, Undo } from "lucide-react";
import { getPost, softDelete, unpublish, type Post } from "@/lib/blogStore";
import { sanitizeHtml } from "@/lib/sanitize";
import { useDialog } from "@/components/DialogProvider";

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(ts);
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { confirm } = useDialog();
  const [post, setPost] = useState<Post | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    getPost(id)
      .then((p) => {
        if (!p || p.deletedAt) {
          setStatus("error");
          setMessage("Post not found.");
          return;
        }
        setPost(p);
        setStatus("idle");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load post.");
      });
  }, [id]);

  async function handleUnpublish() {
    if (!post) return;
    try {
      await unpublish(post.id);
      setPost({ ...post, status: "draft", publishedAt: null });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to unpublish.");
    }
  }

  async function handleDelete() {
    if (!post) return;
    const ok = await confirm({
      title: "Move to trash",
      message: "Move this post to trash? You can restore it later.",
      confirmLabel: "Move to trash",
    });
    if (!ok) return;
    try {
      await softDelete(post.id);
      router.push("/blog");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (status === "error" || !post) {
    return (
      <div className="space-y-4 pt-2">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ChevronLeft size={16} /> Blog
        </Link>
        <p className="text-sm text-text-muted">{message}</p>
      </div>
    );
  }

  const published = post.status === "published";

  return (
    <article className="mx-auto max-w-[720px] space-y-6 pt-2">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ChevronLeft size={16} /> Blog
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href={`/blog/${post.id}/edit`}
            title="Edit"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
          >
            <Pencil size={17} />
          </Link>
          {published && (
            <button
              onClick={handleUnpublish}
              title="Unpublish"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
            >
              <Undo size={17} />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={published}
            title={published ? "Unpublish first to delete" : "Move to trash"}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-sunken hover:text-text disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {post.title || "Untitled"}
        </h1>
        <p className="text-sm text-text-muted">
          {published && post.publishedAt
            ? `Published ${formatDate(post.publishedAt)}`
            : `Draft · updated ${formatDate(post.updatedAt)}`}
        </p>
      </header>

      {message && <p className="text-sm text-red-400">{message}</p>}

      <div
        className="prose-reader"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.contentHtml) }}
      />
    </article>
  );
}
