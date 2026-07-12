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
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  GripVertical,
  ListChecks,
  Loader2,
  Palette,
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
  getStickyCache,
  listSections,
  listStickies,
  listStickyTrash,
  restoreSticky,
  setStickyCache,
  softDeleteSticky,
  updateSection,
  updateSticky,
  type Sticky,
  type StickyColor,
  type StickyItem,
  type StickySection,
} from "@/lib/stickyStore";
import { useDialog } from "@/components/DialogProvider";

const COLORS: StickyColor[] = [
  "plain",
  "stone",
  "amber",
  "peach",
  "rose",
  "blossom",
  "lilac",
  "sky",
  "mint",
  "sage",
];
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
  onMove,
}: {
  item: StickyItem;
  autoFocus: boolean;
  onChange: (text: string) => void;
  onEnter: () => void;
  onEmptyBackspace: () => void;
  onMove?: (dir: -1 | 1) => void;
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
        } else if (e.altKey && e.key === "ArrowUp" && onMove) {
          e.preventDefault();
          onMove(-1);
        } else if (e.altKey && e.key === "ArrowDown" && onMove) {
          e.preventDefault();
          onMove(1);
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
  const [colorOpen, setColorOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Close the palette on outside tap/click.
  useEffect(() => {
    if (!colorOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!paletteRef.current?.contains(e.target as Node)) {
        setColorOpen(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [colorOpen]);

  // Keep-style preview: completed items hide behind a "+N completed" line.
  const unchecked = sticky.items.filter((i) => !i.done);
  const doneCount = sticky.items.length - unchecked.length;
  const previewItems = unchecked.slice(0, 8);
  const moreCount = unchecked.length - previewItems.length;

  return (
    <div
      ref={(el) => {
        setNodeRef(el);
        paletteRef.current = el;
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        background: `var(--sticky-${sticky.color})`,
      }}
      className={`group relative flex flex-col rounded-2xl border border-border p-2 sm:p-3 ${
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
        <button
          onClick={() => setColorOpen((v) => !v)}
          aria-label="Change color"
          className={`sticky-ctl flex h-6 w-6 cursor-pointer items-center justify-center rounded transition-opacity group-hover:opacity-100 ${
            colorOpen
              ? "text-text-muted opacity-100"
              : "text-text-faint opacity-0 hover:text-text-muted"
          }`}
        >
          <Palette size={14} />
        </button>
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

      {colorOpen && (
        <div className="absolute -top-3 right-2 z-20 grid grid-cols-5 gap-1.5 rounded-2xl border border-border bg-bg-elevated px-2.5 py-2 shadow-lg">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => {
                onColor(sticky.id, c);
                setColorOpen(false);
              }}
              aria-label={`Color ${c}`}
              style={{ background: `var(--sticky-${c})` }}
              className={`h-5 w-5 cursor-pointer rounded-full border transition-transform hover:scale-110 ${
                sticky.color === c
                  ? "border-2 border-text-muted"
                  : "border-border-strong"
              }`}
            />
          ))}
        </div>
      )}

      <button
        onClick={() => onOpen(sticky.id)}
        className="mt-1 cursor-pointer px-1 pb-1 text-left"
        aria-label="Open sticky"
      >
        {sticky.kind === "text" ? (
          sticky.body.trim() ? (
            <div className="max-h-[16.5em] overflow-hidden text-xs leading-relaxed sm:text-sm">
              {sticky.body.split("\n").slice(0, 10).map((line, i) => (
                <div
                  key={i}
                  // Hanging indent: wrapped text tucks under the content,
                  // not under the "1." / "•" marker.
                  className={
                    /^(\d+[.)]|[•\-*])\s/.test(line) ? "-indent-5 pl-5" : ""
                  }
                >
                  {line || " "}
                </div>
              ))}
              {sticky.body.split("\n").length > 10 && (
                <div className="text-[11px] text-text-faint">…</div>
              )}
            </div>
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

// One draggable checklist row in the modal editor.
function ModalItemRow({
  item,
  autoFocus,
  onTick,
  onChange,
  onEnter,
  onEmptyBackspace,
  onMove,
}: {
  item: StickyItem;
  autoFocus: boolean;
  onTick: () => void;
  onChange: (text: string) => void;
  onEnter: () => void;
  onEmptyBackspace: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group/item flex items-start gap-1.5 ${
        isDragging ? "z-10 opacity-70" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag item"
        className="sticky-ctl mt-[3px] flex h-4 w-4 shrink-0 cursor-grab touch-none items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-text-muted group-hover/item:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={13} />
      </button>
      <button
        onClick={onTick}
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
        autoFocus={autoFocus}
        onChange={onChange}
        onEnter={onEnter}
        onEmptyBackspace={onEmptyBackspace}
        onMove={onMove}
      />
    </li>
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

  const itemSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

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

  function moveItem(itemId: string, dir: -1 | 1) {
    const idx = sticky.items.findIndex((i) => i.id === itemId);
    const to = idx + dir;
    if (idx < 0 || to < 0 || to >= sticky.items.length) return;
    const next = [...sticky.items];
    [next[idx], next[to]] = [next[to], next[idx]];
    setItems(next);
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
        <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3">
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
              <DndContext
                sensors={itemSensors}
                collisionDetection={closestCenter}
                onDragEnd={({ active, over }) => {
                  if (!over || active.id === over.id) return;
                  const from = sticky.items.findIndex((i) => i.id === active.id);
                  const to = sticky.items.findIndex((i) => i.id === over.id);
                  if (from < 0 || to < 0) return;
                  setItems(arrayMove(sticky.items, from, to));
                }}
              >
                <SortableContext
                  items={sticky.items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <ul className="space-y-1">
                    {sticky.items.map((item) => (
                      <ModalItemRow
                        key={item.id}
                        item={item}
                        autoFocus={focusItem === item.id}
                        onTick={() => tickItem(item.id)}
                        onChange={(text) => editItem(item.id, text)}
                        onEnter={() => addItemAfter(item.id)}
                        onEmptyBackspace={() => removeItem(item.id)}
                        onMove={(dir) => moveItem(item.id, dir)}
                      />
                    ))}
                  </ul>
                </SortableContext>
              </DndContext>
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
  const [actionsFor, setActionsFor] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLDivElement>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // Close section actions on outside tap.
  useEffect(() => {
    if (!actionsFor) return;
    const onDown = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.("[data-section-tab]")) {
        setActionsFor(null);
      }
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [actionsFor]);

  // Close the add-menus on outside click/tap.
  useEffect(() => {
    if (!menuOpen && !fabOpen) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t)) setMenuOpen(false);
      if (!fabRef.current?.contains(t)) setFabOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuOpen, fabOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } })
  );

  useEffect(() => {
    // Render the cached board instantly, then refresh in the background.
    const cached = getStickyCache();
    if (cached) {
      setStickies(cached.stickies);
      setSections(cached.sections);
      setTrash(cached.trash);
      if (cached.sections[0]?.pinned) setActive(cached.sections[0].id);
      setStatus("idle");
    }
    Promise.all([listStickies(), listSections(), listStickyTrash()])
      .then(([rows, secs, deleted]) => {
        setStickies(rows);
        setSections(secs);
        setTrash(deleted);
        // Land on the first pinned section when there is one.
        if (!cached && secs[0]?.pinned) setActive(secs[0].id);
        setStatus("idle");
      })
      .catch((err) => {
        if (!cached) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : "Failed to load.");
        }
      });
  }, []);

  // Keep the cache in sync with whatever the board currently shows.
  useEffect(() => {
    if (status === "idle") setStickyCache({ stickies, sections, trash });
  }, [status, stickies, sections, trash]);

  async function add(kind: "text" | "list") {
    setMenuOpen(false);
    setFabOpen(false);
    setCreating(true);
    try {
      const top = stickies.length
        ? Math.min(...stickies.map((s) => s.position)) - 1
        : 0;
      const sticky = await createSticky(
        top,
        kind,
        active === "all" || active === "trash" ? null : active
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

  // Pinned first, then alphabetical.
  const orderedSections = [...sections].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)
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
        <button
          onClick={() => setActive("trash")}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
            active === "trash"
              ? "bg-accent text-white shadow-sm"
              : "border border-border text-text-muted hover:bg-bg-sunken hover:text-text"
          }`}
        >
          <Trash2 size={15} />
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
              <span key={section.id} className="relative" data-section-tab>
                <button
                  onClick={() => {
                    if (isActive) {
                      // Second tap on the active tab toggles its actions.
                      setActionsFor((cur) =>
                        cur === section.id ? null : section.id
                      );
                    } else {
                      setActive(section.id);
                      setActionsFor(null);
                    }
                  }}
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
                {actionsFor === section.id && (
                  <span className="absolute bottom-full left-0 z-20 mb-1 flex items-center gap-0.5 rounded-lg border border-border bg-bg-elevated px-1 py-0.5 shadow-lg">
                    <button
                      onClick={() => {
                        pinSection(section);
                        setActionsFor(null);
                      }}
                      aria-label={section.pinned ? "Unpin section" : "Pin section"}
                      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-bg-sunken ${
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
                      onClick={() => {
                        setActionsFor(null);
                        editSection(section);
                      }}
                      aria-label="Rename section"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-text-faint hover:bg-bg-sunken hover:text-text"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => {
                        setActionsFor(null);
                        removeSection(section);
                      }}
                      aria-label="Delete section"
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-text-faint hover:bg-bg-sunken hover:text-accent-text"
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
          <div ref={menuRef} className="relative ml-auto hidden sm:block">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              disabled={creating}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {creating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
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

      {/* Mobile: floating create button above the bottom tab bar */}
      <div ref={fabRef} className="fixed bottom-20 right-4 z-30 sm:hidden">
        {fabOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-36 overflow-hidden rounded-xl border border-border bg-bg-elevated shadow-xl">
            <button
              onClick={() => add("text")}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-bg-sunken"
            >
              <Text size={15} className="text-text-muted" /> Text
            </button>
            <button
              onClick={() => add("list")}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-bg-sunken"
            >
              <ListChecks size={15} className="text-text-muted" /> List
            </button>
          </div>
        )}
        <button
          onClick={() => setFabOpen((v) => !v)}
          disabled={creating}
          aria-label="New sticky"
          className="flex h-13 w-13 cursor-pointer items-center justify-center rounded-full bg-accent text-white shadow-lg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {creating ? (
            <Loader2 size={22} className="animate-spin" />
          ) : (
            <Plus size={22} />
          )}
        </button>
      </div>

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
