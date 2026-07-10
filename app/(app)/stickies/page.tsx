"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  ListChecks,
  Loader2,
  Pencil,
  Pin,
  Plus,
  StickyNote,
  Text,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  createSection,
  createSticky,
  deleteSection,
  deleteSticky,
  listSections,
  listStickies,
  listStickyTrash,
  restoreSticky,
  softDeleteSticky,
  updateSection,
  updateSticky,
  type Sticky,
  type StickyColor,
  type StickyItem,
  type StickySection,
} from "@/lib/stickyStore";
import { useDialog } from "@/components/DialogProvider";

const COLORS: StickyColor[] = ["plain", "amber", "rose", "sage", "sky"];
const SAVE_DEBOUNCE_MS = 500;

function newItem(text = ""): StickyItem {
  return { id: crypto.randomUUID(), text, done: false };
}

// One list row's text — a textarea so long lines wrap, auto-grown to fit.
function ItemText({
  item,
  autoFocus,
  onChange,
  onEnter,
  onEmptyBackspace,
}: {
  item: StickyItem;
  autoFocus: boolean;
  onChange: (text: string) => void;
  onEnter: () => void;
  onEmptyBackspace: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize, item.text]);

  return (
    <textarea
      ref={ref}
      autoFocus={autoFocus}
      value={item.text}
      rows={1}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Backspace" && item.text === "") {
          e.preventDefault();
          onEmptyBackspace();
        }
      }}
      placeholder="List item"
      className={`w-full resize-none bg-transparent text-xs leading-relaxed outline-none placeholder:text-text-faint sm:text-sm ${
        item.done ? "text-text-faint line-through" : ""
      }`}
    />
  );
}

// Compact board preview — click to open the editor modal (Keep-style).
function StickyCard({
  sticky,
  onPatch,
  onColor,
  onDelete,
  onOpen,
}: {
  sticky: Sticky;
  onPatch: (id: string, patch: Partial<Sticky>) => void;
  onColor: (id: string, color: StickyColor) => void;
  onDelete: (sticky: Sticky) => void;
  onOpen: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sticky.id });

  // Keep-style preview: completed items hide behind a "+N completed" line.
  const unchecked = sticky.items.filter((i) => !i.done);
  const doneCount = sticky.items.length - unchecked.length;
  const previewItems = unchecked.slice(0, 8);
  const moreCount = unchecked.length - previewItems.length;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: `var(--sticky-${sticky.color})`,
      }}
      className={`group flex flex-col rounded-2xl border border-border p-2 sm:p-3 ${
        isDragging ? "z-10 opacity-80 shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-1">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag"
          className="sticky-ctl flex h-6 w-6 cursor-grab touch-none items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover:opacity-100 active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
        <span className="flex-1" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onColor(sticky.id, c)}
            aria-label={`Color ${c}`}
            style={{ background: `var(--sticky-${c})` }}
            className={`sticky-ctl h-4 w-4 cursor-pointer rounded-full border opacity-0 transition-opacity hover:scale-110 group-hover:opacity-100 ${
              sticky.color === c
                ? "border-2 border-text-muted"
                : "border-border-strong"
            }`}
          />
        ))}
        <button
          onClick={() => onPatch(sticky.id, { pinned: !sticky.pinned })}
          aria-label={sticky.pinned ? "Unpin" : "Pin"}
          className={`sticky-ctl ml-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-opacity group-hover:opacity-100 ${
            sticky.pinned
              ? "text-accent-text opacity-100"
              : "text-text-faint opacity-0 hover:text-text-muted"
          }`}
        >
          <Pin size={14} className={sticky.pinned ? "fill-current" : ""} />
        </button>
        <button
          onClick={() => onDelete(sticky)}
          aria-label="Delete"
          className="sticky-ctl flex h-6 w-6 cursor-pointer items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-accent-text group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <button
        onClick={() => onOpen(sticky.id)}
        className="mt-1 cursor-pointer px-1 pb-1 text-left"
        aria-label="Open sticky"
      >
        {sticky.kind === "text" ? (
          sticky.body.trim() ? (
            <p className="line-clamp-[10] whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
              {sticky.body}
            </p>
          ) : (
            <p className="text-xs text-text-faint sm:text-sm">Empty note</p>
          )
        ) : (
          <ul className="space-y-0.5">
            {previewItems.map((item) => (
              <li key={item.id} className="flex items-start gap-2">
                <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-text" />
                <span className="min-w-0 break-words text-xs leading-relaxed sm:text-sm">
                  {item.text || (
                    <span className="text-text-faint">List item</span>
                  )}
                </span>
              </li>
            ))}
            {moreCount > 0 && (
              <li className="pl-6 text-[11px] text-text-faint">
                +{moreCount} more
              </li>
            )}
            {doneCount > 0 && (
              <li className="flex items-center gap-2 pt-0.5 text-[11px] text-text-faint">
                <Check size={12} strokeWidth={3} className="shrink-0" />
                {doneCount} completed
              </li>
            )}
          </ul>
        )}
      </button>
    </div>
  );
}

// Full edit view — Keep-style modal over the board.
function StickyModal({
  sticky,
  sections,
  onPatch,
  onColor,
  onDelete,
  onClose,
}: {
  sticky: Sticky;
  sections: StickySection[];
  onPatch: (id: string, patch: Partial<Sticky>) => void;
  onColor: (id: string, color: StickyColor) => void;
  onDelete: (sticky: Sticky) => void;
  onClose: () => void;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [focusItem, setFocusItem] = useState<string | null>(null);

  const resize = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setItems(items: StickyItem[]) {
    onPatch(sticky.id, { items });
  }

  function editItem(itemId: string, text: string) {
    setItems(sticky.items.map((i) => (i.id === itemId ? { ...i, text } : i)));
  }

  function tickItem(itemId: string) {
    setItems(
      sticky.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
    );
  }

  function addItemAfter(itemId?: string) {
    const idx = itemId
      ? sticky.items.findIndex((i) => i.id === itemId)
      : sticky.items.length - 1;
    const fresh = newItem();
    const next = [...sticky.items];
    next.splice(idx + 1, 0, fresh);
    setItems(next);
    setFocusItem(fresh.id);
  }

  function removeItem(itemId: string) {
    const idx = sticky.items.findIndex((i) => i.id === itemId);
    const next = sticky.items.filter((i) => i.id !== itemId);
    setItems(next.length ? next : [newItem()]);
    const prev = sticky.items[idx - 1];
    if (prev) setFocusItem(prev.id);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{ background: `var(--sticky-${sticky.color})` }}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-border shadow-xl"
      >
        <div className="flex items-center gap-1.5 px-4 pt-3">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => onColor(sticky.id, c)}
              aria-label={`Color ${c}`}
              style={{ background: `var(--sticky-${c})` }}
              className={`h-5 w-5 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                sticky.color === c
                  ? "border-2 border-text-muted"
                  : "border-border-strong"
              }`}
            />
          ))}
          <span className="flex-1" />
          <button
            onClick={() => onPatch(sticky.id, { pinned: !sticky.pinned })}
            aria-label={sticky.pinned ? "Unpin" : "Pin"}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-black/5 ${
              sticky.pinned ? "text-accent-text" : "text-text-muted"
            }`}
          >
            <Pin size={16} className={sticky.pinned ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => onDelete(sticky)}
            aria-label="Delete"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-black/5 hover:text-accent-text"
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 pb-4 pt-2">
          {sticky.kind === "text" ? (
            <textarea
              ref={areaRef}
              autoFocus
              defaultValue={sticky.body}
              onInput={(e) => {
                const el = e.currentTarget;
                // "- " at the start of a line becomes a bullet.
                const pos = el.selectionStart;
                if (
                  pos >= 2 &&
                  el.value.slice(pos - 2, pos) === "- " &&
                  (pos === 2 || el.value[pos - 3] === "\n")
                ) {
                  el.value =
                    el.value.slice(0, pos - 2) + "• " + el.value.slice(pos);
                  el.setSelectionRange(pos, pos);
                }
                resize();
                onPatch(sticky.id, { body: el.value });
              }}
              placeholder="Jot something…"
              rows={4}
              className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-text-faint sm:text-[15px]"
            />
          ) : (
            <>
              <ul className="space-y-1">
                {sticky.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-2">
                    <button
                      onClick={() => tickItem(item.id)}
                      aria-label={item.done ? "Uncheck" : "Check"}
                      className={`mt-[3px] flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border-2 transition-colors ${
                        item.done
                          ? "border-accent bg-accent text-white"
                          : "border-text hover:border-accent"
                      }`}
                    >
                      {item.done && <Check size={11} strokeWidth={3} />}
                    </button>
                    <ItemText
                      item={item}
                      autoFocus={focusItem === item.id}
                      onChange={(text) => editItem(item.id, text)}
                      onEnter={() => addItemAfter(item.id)}
                      onEmptyBackspace={() => removeItem(item.id)}
                    />
                  </li>
                ))}
              </ul>
              <button
                onClick={() => addItemAfter()}
                className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-medium text-text-muted hover:text-text"
              >
                <Plus size={14} /> List item
              </button>
            </>
          )}
        </div>

        {sections.length > 0 && (
          <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
            <span className="text-xs text-text-faint">Section</span>
            <select
              value={sticky.sectionId ?? ""}
              onChange={(e) =>
                onPatch(sticky.id, { sectionId: e.target.value || null })
              }
              className="cursor-pointer rounded-lg border border-border bg-transparent px-2 py-1 text-xs outline-none focus:border-border-strong"
            >
              <option value="">None</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StickiesPage() {
  const { confirm, prompt } = useDialog();
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [trash, setTrash] = useState<Sticky[]>([]);
  const [sections, setSections] = useState<StickySection[]>([]);
  const [active, setActive] = useState<string>("all");
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Close the add-menu on outside click.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  useEffect(() => {
    Promise.all([listStickies(), listSections(), listStickyTrash()])
      .then(([rows, secs, deleted]) => {
        setStickies(rows);
        setSections(secs);
        setTrash(deleted);
        // Land on the first pinned section when there is one.
        if (secs[0]?.pinned) setActive(secs[0].id);
        setStatus("idle");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof Error ? err.message : "Failed to load.");
      });
  }, []);

  async function add(kind: "text" | "list") {
    setMenuOpen(false);
    setCreating(true);
    try {
      const top = stickies.length
        ? Math.min(...stickies.map((s) => s.position)) - 1
        : 0;
      const sticky = await createSticky(
        top,
        kind,
        active === "all" ? null : active
      );
      setStickies((cur) => [sticky, ...cur]);
      setOpenId(sticky.id);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to create.");
    } finally {
      setCreating(false);
    }
  }

  const pendingPatches = useRef(new Map<string, Partial<Sticky>>());

  const queuePatch = useCallback((id: string, patch: Partial<Sticky>) => {
    setStickies((cur) => cur.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    const pending = pendingPatches.current;
    pending.set(id, { ...pending.get(id), ...patch });
    const timers = saveTimers.current;
    const existing = timers.get(id);
    if (existing) clearTimeout(existing);
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id);
        const merged = pending.get(id);
        pending.delete(id);
        if (merged) updateSticky(id, merged).catch(() => {});
      }, SAVE_DEBOUNCE_MS)
    );
  }, []);

  async function setColor(id: string, color: StickyColor) {
    setStickies((cur) => cur.map((s) => (s.id === id ? { ...s, color } : s)));
    updateSticky(id, { color }).catch(() => {});
  }

  async function remove(sticky: Sticky) {
    const ok = await confirm({
      title: "Move to trash",
      message: "Send this sticky to trash? You can restore it later.",
      confirmLabel: "Move to trash",
    });
    if (!ok) return;
    setStickies((cur) => cur.filter((s) => s.id !== sticky.id));
    setTrash((cur) => [
      { ...sticky, deletedAt: new Date().toISOString() },
      ...cur,
    ]);
    softDeleteSticky(sticky.id).catch(() => {});
  }

  async function restore(sticky: Sticky) {
    const ok = await confirm({
      title: "Restore sticky",
      message: "Bring this sticky back to the board?",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    setTrash((cur) => cur.filter((s) => s.id !== sticky.id));
    setStickies((cur) => [{ ...sticky, deletedAt: null }, ...cur]);
    restoreSticky(sticky.id).catch(() => {});
  }

  async function deleteForever(sticky: Sticky) {
    const ok = await confirm({
      title: "Delete forever",
      message: "Permanently delete this sticky? This cannot be undone.",
      confirmLabel: "Delete forever",
      danger: true,
    });
    if (!ok) return;
    setTrash((cur) => cur.filter((s) => s.id !== sticky.id));
    deleteSticky(sticky.id).catch(() => {});
  }

  async function addSection() {
    const name = (
      await prompt({ title: "New section", placeholder: "Section name" })
    )?.trim();
    if (!name) return;
    try {
      const last = sections[sections.length - 1];
      const section = await createSection(name, (last?.position ?? 0) + 1);
      setSections((cur) => [...cur, section]);
      setActive(section.id);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to add section.");
    }
  }

  async function editSection(section: StickySection) {
    const name = (
      await prompt({
        title: "Rename section",
        defaultValue: section.name,
        confirmLabel: "Rename",
      })
    )?.trim();
    if (!name || name === section.name) return;
    setSections((cur) =>
      cur.map((s) => (s.id === section.id ? { ...s, name } : s))
    );
    updateSection(section.id, { name }).catch(() => {});
  }

  function pinSection(section: StickySection) {
    const pinned = !section.pinned;
    setSections((cur) =>
      cur.map((s) => (s.id === section.id ? { ...s, pinned } : s))
    );
    updateSection(section.id, { pinned }).catch(() => {});
  }

  async function removeSection(section: StickySection) {
    const ok = await confirm({
      title: "Delete section",
      message: `Delete "${section.name}"? Its stickies move back to All.`,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setSections((cur) => cur.filter((s) => s.id !== section.id));
    setStickies((cur) =>
      cur.map((s) =>
        s.sectionId === section.id ? { ...s, sectionId: null } : s
      )
    );
    setActive("all");
    deleteSection(section.id).catch(() => {});
  }

  const orderedSections = [...sections].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.position - b.position
  );

  const byPosition = (a: Sticky, b: Sticky) => a.position - b.position;
  const inView =
    active === "all" || active === "trash"
      ? stickies
      : stickies.filter((s) => s.sectionId === active);
  const pinned = inView.filter((s) => s.pinned).sort(byPosition);
  const others = inView.filter((s) => !s.pinned).sort(byPosition);

  // Reorder within a group; the dragged card takes the midpoint of its
  // drop neighbors' positions.
  function makeDragEnd(group: Sticky[]) {
    return (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const from = group.findIndex((s) => s.id === active.id);
      const to = group.findIndex((s) => s.id === over.id);
      if (from < 0 || to < 0) return;
      const next = arrayMove(group, from, to);
      const prev = next[to - 1]?.position;
      const after = next[to + 1]?.position;
      let position: number;
      if (prev === undefined && after === undefined) position = 0;
      else if (prev === undefined) position = after! - 1;
      else if (after === undefined) position = prev + 1;
      else position = (prev + after) / 2;
      setStickies((cur) =>
        cur.map((s) => (s.id === active.id ? { ...s, position } : s))
      );
      updateSticky(String(active.id), { position }).catch(() => {});
    };
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3 pt-2">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Stickies
          </h1>
          <p className="text-sm text-text-muted">
            Fast capture. Drag to arrange, toss when done.
          </p>
        </div>
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            disabled={creating}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-accent px-3.5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {creating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}
            New
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-lg">
              <button
                onClick={() => add("text")}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-bg-sunken"
              >
                <Text size={15} className="text-text-muted" /> Text
              </button>
              <button
                onClick={() => add("list")}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-bg-sunken"
              >
                <ListChecks size={15} className="text-text-muted" /> List
              </button>
            </div>
          )}
        </div>
      </header>

      {status === "idle" && (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActive("all")}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active === "all"
                ? "bg-accent text-white shadow-sm"
                : "border border-border text-text-muted hover:bg-bg-sunken hover:text-text"
            }`}
          >
            All
          </button>
          {orderedSections.length > 0 && (
            <span className="mx-1 h-5 w-px shrink-0 bg-border-strong" />
          )}
          {orderedSections.map((section) => {
            const isActive = active === section.id;
            return (
              <span key={section.id} className="flex items-center">
                <button
                  onClick={() => setActive(section.id)}
                  className={`flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-accent text-white shadow-sm"
                      : "border border-border text-text-muted hover:bg-bg-sunken hover:text-text"
                  }`}
                >
                  {section.pinned && (
                    <Pin
                      size={11}
                      className={`fill-current ${
                        isActive ? "text-white/80" : "text-text-faint"
                      }`}
                    />
                  )}
                  {section.name}
                </button>
                {isActive && (
                  <span className="ml-0.5 flex items-center">
                    <button
                      onClick={() => pinSection(section)}
                      aria-label={section.pinned ? "Unpin section" : "Pin section"}
                      className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg hover:bg-bg-sunken ${
                        section.pinned
                          ? "text-accent-text"
                          : "text-text-faint hover:text-text"
                      }`}
                    >
                      <Pin
                        size={13}
                        className={section.pinned ? "fill-current" : ""}
                      />
                    </button>
                    <button
                      onClick={() => editSection(section)}
                      aria-label="Rename section"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-faint hover:bg-bg-sunken hover:text-text"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => removeSection(section)}
                      aria-label="Delete section"
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-text-faint hover:bg-bg-sunken hover:text-accent-text"
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                )}
              </span>
            );
          })}
          <button
            onClick={addSection}
            aria-label="New section"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-text-faint hover:bg-bg-sunken hover:text-text"
          >
            <Plus size={15} />
          </button>
          <button
            onClick={() => setActive("trash")}
            className={`ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              active === "trash"
                ? "bg-accent text-white shadow-sm"
                : "border border-border text-text-muted hover:bg-bg-sunken hover:text-text"
            }`}
          >
            <Trash2 size={14} />
            Trash
            {trash.length > 0 && (
              <span
                className={`text-xs tabular-nums ${
                  active === "trash" ? "text-white/70" : "text-text-faint"
                }`}
              >
                {trash.length}
              </span>
            )}
          </button>
        </div>
      )}

      {status === "loading" ? (
        <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : status === "error" ? (
        <p className="py-10 text-center text-sm text-text-muted">{message}</p>
      ) : active === "trash" ? (
        trash.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
            <Trash2 size={26} />
            <p className="text-sm">Trash is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {trash.map((sticky) => (
              <div
                key={sticky.id}
                style={{ background: `var(--sticky-${sticky.color})` }}
                className="flex flex-col rounded-2xl border border-border p-2 opacity-80 sm:p-3"
              >
                <div className="px-1 pb-1">
                  {sticky.kind === "text" ? (
                    <p className="line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                      {sticky.body.trim() || (
                        <span className="text-text-faint">Empty note</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs text-text-muted sm:text-sm">
                      List · {sticky.items.filter((i) => i.text.trim()).length}{" "}
                      items
                    </p>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-1 border-t border-border pt-1.5">
                  <button
                    onClick={() => restore(sticky)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-accent-text hover:bg-accent-soft"
                  >
                    <Undo2 size={13} /> Restore
                  </button>
                  <span className="flex-1" />
                  <button
                    onClick={() => deleteForever(sticky)}
                    title="Delete forever"
                    className="inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-400 hover:bg-bg-sunken"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : inView.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
          <StickyNote size={26} />
          <p className="text-sm">
            {active === "all"
              ? "No stickies — jot something."
              : "Nothing in this section yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pinned.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                Pinned
              </h2>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={makeDragEnd(pinned)}
              >
                <SortableContext
                  items={pinned.map((s) => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 items-start gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {pinned.map((sticky) => (
                      <StickyCard
                        key={sticky.id}
                        sticky={sticky}
                        onPatch={queuePatch}
                        onColor={setColor}
                        onDelete={remove}
                        onOpen={setOpenId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}

          {others.length > 0 && (
            <section className="space-y-2">
              {pinned.length > 0 && (
                <h2 className="text-[10px] font-semibold uppercase tracking-widest text-text-faint">
                  Others
                </h2>
              )}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={makeDragEnd(others)}
              >
                <SortableContext
                  items={others.map((s) => s.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-2 items-start gap-2 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {others.map((sticky) => (
                      <StickyCard
                        key={sticky.id}
                        sticky={sticky}
                        onPatch={queuePatch}
                        onColor={setColor}
                        onDelete={remove}
                        onOpen={setOpenId}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}
        </div>
      )}

      {openId &&
        (() => {
          const open = stickies.find((s) => s.id === openId);
          if (!open) return null;
          return (
            <StickyModal
              sticky={open}
              sections={sections}
              onPatch={queuePatch}
              onColor={setColor}
              onDelete={remove}
              onClose={() => setOpenId(null)}
            />
          );
        })()}
    </div>
  );
}
