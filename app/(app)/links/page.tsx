"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Globe,
  GripVertical,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addLink,
  getLinkCache,
  listLinks,
  removeLink,
  setLinkCache,
  updateLink,
  type LinkBookmark,
} from "@/lib/linkStore";
import { useDialog } from "@/components/DialogProvider";

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Globe size={16} className="shrink-0 text-text-faint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

// One drag-sortable link row.
function LinkRow({
  link,
  draggable,
  onEdit,
  onDelete,
}: {
  link: LinkBookmark;
  draggable: boolean;
  onEdit: (link: LinkBookmark) => void;
  onDelete: (link: LinkBookmark) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id, disabled: !draggable });
  const domain = domainOf(link.url);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-1.5 rounded-xl px-2 py-2.5 transition-colors hover:bg-bg-sunken ${
        isDragging ? "z-10 bg-bg-elevated opacity-80 shadow-lg" : ""
      }`}
    >
      {draggable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag"
          className="sticky-ctl flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      )}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-center gap-2.5"
      >
        <Favicon domain={domain} />
        <span className="min-w-0">
          <span className="flex items-baseline gap-2">
            <span className="truncate text-sm font-medium">{link.name}</span>
            <span className="shrink-0 text-[11px] text-text-faint">
              {domain}
            </span>
          </span>
          {link.note && (
            <span className="block truncate text-xs text-text-muted">
              {link.note}
            </span>
          )}
        </span>
        <ExternalLink
          size={13}
          className="shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100"
        />
      </a>
      <button
        onClick={() => onEdit(link)}
        aria-label="Edit"
        className="sticky-ctl flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => onDelete(link)}
        aria-label="Remove"
        className="sticky-ctl flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-text-faint opacity-0 transition-opacity hover:text-accent-text group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function LinksPage() {
  const { confirm, prompt } = useDialog();
  const [links, setLinks] = useState<LinkBookmark[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  useEffect(() => {
    const cached = getLinkCache();
    if (cached) {
      setLinks(cached);
      setStatus("idle");
    }
    listLinks()
      .then((rows) => {
        setLinks(rows);
        setStatus("idle");
      })
      .catch((err) => {
        if (!cached) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Failed to load.");
        }
      });
  }, []);

  useEffect(() => {
    if (status === "idle") setLinkCache(links);
  }, [status, links]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return links;
    return links.filter((l) =>
      `${l.name} ${l.url} ${l.note}`.toLowerCase().includes(q)
    );
  }, [links, query]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const raw = url.trim();
    if (!raw) return;
    const full = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let host: string;
    try {
      host = new URL(full).hostname.replace(/^www\./, "");
    } catch {
      setFormError("Enter a valid URL.");
      return;
    }
    if (links.some((l) => l.url === full)) {
      setFormError("Already saved.");
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      const top = links.length
        ? Math.min(...links.map((l) => l.position)) - 1
        : 0;
      const link = await addLink(name.trim() || host, full, note.trim(), top);
      setLinks((cur) => [link, ...cur]);
      setUrl("");
      setName("");
      setNote("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Couldn't save link.");
    } finally {
      setAdding(false);
    }
  }

  async function edit(link: LinkBookmark) {
    const newName = await prompt({
      title: "Name",
      defaultValue: link.name,
      confirmLabel: "Next",
    });
    if (newName === null) return;
    const newNote = await prompt({
      title: "Note",
      defaultValue: link.note,
      placeholder: "Why keep this?",
      confirmLabel: "Save",
    });
    if (newNote === null) return;
    const patch = {
      name: newName.trim() || domainOf(link.url),
      note: newNote.trim(),
    };
    setLinks((cur) =>
      cur.map((l) => (l.id === link.id ? { ...l, ...patch } : l))
    );
    updateLink(link.id, patch).catch(() => {});
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = links.findIndex((l) => l.id === active.id);
    const to = links.findIndex((l) => l.id === over.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(links, from, to);
    const prev = next[to - 1]?.position;
    const after = next[to + 1]?.position;
    let position: number;
    if (prev === undefined && after === undefined) position = 0;
    else if (prev === undefined) position = after! - 1;
    else if (after === undefined) position = prev + 1;
    else position = (prev + after) / 2;
    next[to] = { ...next[to], position };
    setLinks(next);
    updateLink(String(active.id), { position }).catch(() => {});
  }

  async function remove(link: LinkBookmark) {
    const ok = await confirm({
      title: "Remove link",
      message: `Remove "${link.name}"?`,
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setLinks((cur) => cur.filter((l) => l.id !== link.id));
    removeLink(link.id).catch(() => {});
  }

  return (
    <div className="mx-auto max-w-[720px] space-y-6">
      <header className="flex items-end justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Links
          </h1>
          <p className="text-sm text-text-muted">
            Links worth keeping — tools, repos, references.
          </p>
        </div>
        <label className="flex w-40 shrink-0 items-center gap-2 rounded-xl border border-border bg-bg-elevated px-2.5 py-1.5 focus-within:border-border-strong sm:w-48">
          <Search size={14} className="shrink-0 text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>
      </header>

      <form onSubmit={submit} className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
            <Plus size={15} className="shrink-0 text-text-faint" />
            <input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="Paste a link"
              className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
            />
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-border-strong sm:w-44"
          />
        </div>
        {url.trim() && (
          <div className="flex gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note — why keep this? (optional)"
              className="flex-1 rounded-xl border border-border bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-border-strong"
            />
            <button
              type="submit"
              disabled={adding}
              className="cursor-pointer rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {adding ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                "Save"
              )}
            </button>
          </div>
        )}
        {formError && <p className="px-1 text-xs text-red-400">{formError}</p>}
      </form>

      {status === "loading" ? (
        <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : status === "error" ? (
        <p className="py-10 text-center text-sm text-text-muted">{message}</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
          <Link2 size={26} />
          <p className="text-sm">
            {links.length === 0 ? "No links yet — paste one above." : "No matches."}
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext
            items={filtered.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {filtered.map((link) => (
                <LinkRow
                  key={link.id}
                  link={link}
                  draggable={!query.trim()}
                  onEdit={edit}
                  onDelete={remove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
