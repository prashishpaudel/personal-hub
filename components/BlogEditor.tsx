"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  TextQuote,
  SquareCode,
  Minus,
  Link2,
  Undo2,
  Redo2,
  Cloud,
  CloudOff,
  Loader2,
  ChevronLeft,
  Send,
  Undo,
  Trash2,
} from "lucide-react";
import NextLink from "next/link";
import {
  publish,
  softDelete,
  unpublish,
  updatePost,
  type Post,
} from "@/lib/blogStore";

const SAVE_DEBOUNCE_MS = 600;

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-35 ${
        active
          ? "bg-accent-soft text-accent-text"
          : "text-text-muted hover:bg-bg-sunken hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />;
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  return (
    <div className="sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-0.5 rounded-xl border border-border bg-bg-elevated/95 px-1.5 py-1 backdrop-blur">
      <ToolbarButton
        label="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        <Code size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Heading 1"
        active={editor.isActive("heading", { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <TextQuote size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        active={editor.isActive("codeBlock")}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <SquareCode size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Horizontal rule"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Link"
        active={editor.isActive("link")}
        onClick={setLink}
      >
        <Link2 size={16} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        label="Undo"
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 size={16} />
      </ToolbarButton>
      <ToolbarButton
        label="Redo"
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 size={16} />
      </ToolbarButton>
    </div>
  );
}

export default function BlogEditor({ post }: { post: Post }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [status, setStatus] = useState(post.status);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved"
  );
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ title?: string; contentHtml?: string }>({});

  const flushSave = useCallback(async () => {
    const patch = pendingRef.current;
    pendingRef.current = {};
    if (patch.title === undefined && patch.contentHtml === undefined) return;
    setSaveState("saving");
    try {
      await updatePost(post.id, patch);
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }, [post.id]);

  const queueSave = useCallback(
    (patch: { title?: string; contentHtml?: string }) => {
      pendingRef.current = { ...pendingRef.current, ...patch };
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    },
    [flushSave]
  );

  // Flush pending changes when leaving the page.
  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      flushSave();
    },
    [flushSave]
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing…" }),
    ],
    content: post.contentHtml,
    editorProps: {
      attributes: {
        class: "prose-reader min-h-[50vh] outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      queueSave({ contentHtml: editor.getHTML() });
    },
  });

  async function handleDelete() {
    if (!window.confirm("Move this draft to trash? You can restore it later.")) {
      return;
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    pendingRef.current = {};
    try {
      await softDelete(post.id);
      router.push("/blog");
    } catch {
      setSaveState("error");
    }
  }

  async function togglePublish() {
    await flushSave();
    try {
      if (status === "published") {
        await unpublish(post.id);
        setStatus("draft");
      } else {
        await publish(post.id);
        setStatus("published");
        router.push(`/blog/${post.id}`);
      }
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-5 pt-2">
      <div className="flex items-center justify-between gap-3">
        <NextLink
          href="/blog"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ChevronLeft size={16} /> Blog
        </NextLink>

        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 text-xs text-text-faint"
            title={saveState === "error" ? "Save failed — keep a copy of your text" : undefined}
          >
            {saveState === "saving" ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Saving…
              </>
            ) : saveState === "error" ? (
              <>
                <CloudOff size={13} className="text-red-400" /> Save failed
              </>
            ) : (
              <>
                <Cloud size={13} /> Saved
              </>
            )}
          </span>

          {status === "draft" && (
            <button
              type="button"
              onClick={handleDelete}
              title="Move to trash"
              aria-label="Move to trash"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-sunken hover:text-text"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={togglePublish}
            className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-3.5 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {status === "published" ? (
              <>
                <Undo size={14} /> Unpublish
              </>
            ) : (
              <>
                <Send size={14} /> Publish
              </>
            )}
          </button>
        </div>
      </div>

      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          queueSave({ title: e.target.value });
        }}
        placeholder="Post title"
        className="w-full bg-transparent font-display text-3xl font-semibold tracking-tight outline-none placeholder:text-text-faint"
      />

      {editor && <Toolbar editor={editor} />}

      <EditorContent editor={editor} />
    </div>
  );
}
