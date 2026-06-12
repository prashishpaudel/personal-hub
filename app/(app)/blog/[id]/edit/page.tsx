"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft, Loader2 } from "lucide-react";
import BlogEditor from "@/components/BlogEditor";
import { getPost, type Post } from "@/lib/blogStore";

export default function EditPostPage() {
  const { id } = useParams<{ id: string }>();
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

  return <BlogEditor post={post} />;
}
