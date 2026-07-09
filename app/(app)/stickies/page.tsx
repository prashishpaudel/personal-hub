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
  Pin,
  Plus,
  StickyNote,
  Text,
  X,
} from "lucide-react";
import {
  createSticky,
  deleteSticky,
  listStickies,
  updateSticky,
  type Sticky,
  type StickyColor,
  type StickyItem,
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

function StickyCard({
  sticky,
  onPatch,
  onColor,
  onDelete,
}: {
  sticky: Sticky;
  onPatch: (id: string, patch: Partial<Sticky>) => void;
  onColor: (id: string, color: StickyColor) => void;
  onDelete: (sticky: Sticky) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sticky.id });
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [focusItem, setFocusItem] = useState<string | null>(null);

  // Grow the textarea with its content.
  const resize = useCallback(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "0";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize]);

  function setItems(items: StickyItem[]) {
    onPatch(sticky.id, { items });
  }

  function editItem(itemId: string, text: string) {
    setItems(
      sticky.items.map((i) => (i.id === itemId ? { ...i, text } : i))
    );
  }

  function tickItem(itemId: string) {
    setItems(
      sticky.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
    );
  }

  function addItemAfter(itemId: string) {
    const idx = sticky.items.findIndex((i) => i.id === itemId);
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
          <X size={14} />
        </button>
      </div>

      {sticky.kind === "text" ? (
        <textarea
          ref={areaRef}
          defaultValue={sticky.body}
          onInput={(e) => {
            resize();
            onPatch(sticky.id, { body: e.currentTarget.value });
          }}
          placeholder="Jot something…"
          rows={2}
          className="mt-1 w-full resize-none bg-transparent px-1 text-xs leading-relaxed outline-none placeholder:text-text-faint sm:text-sm"
        />
      ) : (
        <ul className="mt-1 space-y-0.5 px-1">
          {sticky.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2">
              <button
                onClick={() => tickItem(item.id)}
                aria-label={item.done ? "Uncheck" : "Check"}
                className={`mt-[3px] flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors ${
                  item.done
                    ? "border-accent bg-accent text-white"
                    : "border-border-strong hover:border-accent"
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
      )}
    </div>
  );
}

export default function StickiesPage() {
  const { confirm } = useDialog();
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
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
    listStickies()
      .then((rows) => {
        setStickies(rows);
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
      const top = stickies.length ? stickies[0].position - 1 : 0;
      const sticky = await createSticky(top, kind);
      setStickies((cur) => [sticky, ...cur]);
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
    const hasContent =
      sticky.kind === "text"
        ? sticky.body.trim() !== ""
        : sticky.items.some((i) => i.text.trim() !== "");
    if (hasContent) {
      const ok = await confirm({
        title: "Delete sticky",
        message: "Toss this sticky? It's gone for good.",
        confirmLabel: "Delete",
        danger: true,
      });
      if (!ok) return;
    }
    setStickies((cur) => cur.filter((s) => s.id !== sticky.id));
    deleteSticky(sticky.id).catch(() => {});
  }

  const byPosition = (a: Sticky, b: Sticky) => a.position - b.position;
  const pinned = stickies.filter((s) => s.pinned).sort(byPosition);
  const others = stickies.filter((s) => !s.pinned).sort(byPosition);

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

      {status === "loading" ? (
        <div className="flex items-center gap-2 py-10 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : status === "error" ? (
        <p className="py-10 text-center text-sm text-text-muted">{message}</p>
      ) : stickies.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-14 text-text-muted">
          <StickyNote size={26} />
          <p className="text-sm">No stickies — jot something.</p>
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
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
