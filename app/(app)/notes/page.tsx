"use client";

import {
  Cloud,
  CloudOff,
  Plus,
  Search,
  Trash2,
  FileText,
  Minus,
  Plus as PlusIcon,
  ChevronLeft,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
};

type NoteRow = {
  id: string;
  title: string;
  body: string;
  updated_at: string;
};

const fontSizeKey = "personal-hub:notes-font-size";
const minFontSize = 14;
const maxFontSize = 24;
const defaultFontSize = 16;
const cols = "id,title,body,updated_at";

function formatDate(value: number) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

function noteFromRow(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export default function NotesPage() {
  const pendingSaveRef = useRef<Partial<Pick<Note, "title" | "body">>>({});
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeId, setActiveId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");
  const [fontSize, setFontSize] = useState(defaultFontSize);
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");

  useEffect(() => {
    const saved = Number(window.localStorage.getItem(fontSizeKey));
    if (saved >= minFontSize && saved <= maxFontSize) setFontSize(saved);
  }, []);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        setMessage("Add Supabase env vars to load notes.");
        return;
      }
      setStatus("loading");
      const { data, error } = await supabase
        .from("notes")
        .select(cols)
        .order("updated_at", { ascending: false });

      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      const loaded = (data ?? []).map(noteFromRow);
      setNotes(loaded);
      setActiveId((current) => current || loaded[0]?.id || "");
      setStatus("idle");
    }
    load();
  }, []);

  useEffect(() => {
    window.localStorage.setItem(fontSizeKey, String(fontSize));
  }, [fontSize]);

  useEffect(
    () => () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    },
    []
  );

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => `${n.title} ${n.body}`.toLowerCase().includes(q));
  }, [notes, query]);

  const activeNote = notes.find((n) => n.id === activeId) ?? notes[0];

  async function addNote() {
    if (!supabase) return;
    setStatus("saving");
    const { data, error } = await supabase
      .from("notes")
      .insert({})
      .select(cols)
      .single();
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    const note = noteFromRow(data);
    setNotes((cur) => [note, ...cur]);
    setActiveId(note.id);
    setMobileView("editor");
    setStatus("idle");
  }

  function updateActiveNote(values: Partial<Pick<Note, "title" | "body">>) {
    if (!activeNote) return;
    const id = activeNote.id;
    setNotes((cur) =>
      cur.map((n) => (n.id === id ? { ...n, ...values, updatedAt: Date.now() } : n))
    );
    persistNote(id, values);
  }

  function persistNote(
    id: string,
    values: Partial<Pick<Note, "title" | "body">>
  ) {
    if (!supabase) return;
    const client = supabase;
    pendingSaveRef.current = { ...pendingSaveRef.current, ...values };
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setStatus("saving");

    saveTimeoutRef.current = setTimeout(async () => {
      const pending = pendingSaveRef.current;
      pendingSaveRef.current = {};
      const { data, error } = await client
        .from("notes")
        .update({ ...pending, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select(cols)
        .single();
      if (error) {
        setStatus("error");
        setMessage(error.message);
        return;
      }
      const saved = noteFromRow(data);
      setNotes((cur) =>
        [
          ...cur.map((n) =>
            n.id === saved.id ? { ...n, updatedAt: saved.updatedAt } : n
          ),
        ].sort((a, b) => b.updatedAt - a.updatedAt)
      );
      setStatus("idle");
    }, 600);
  }

  async function deleteActiveNote() {
    if (!activeNote || !supabase) return;
    if (
      !window.confirm(
        `Delete "${activeNote.title || "Untitled note"}"? This cannot be undone.`
      )
    )
      return;
    const id = activeNote.id;
    const next = notes.filter((n) => n.id !== id);
    setStatus("saving");
    setNotes(next);
    setActiveId(next[0]?.id || "");
    setMobileView("list");
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("idle");
  }

  function changeFontSize(direction: "smaller" | "larger") {
    setFontSize((cur) => {
      const next = direction === "smaller" ? cur - 1 : cur + 1;
      return Math.min(maxFontSize, Math.max(minFontSize, next));
    });
  }

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] gap-4 md:h-[calc(100dvh-4.5rem)]">
      {/* List pane */}
      <aside
        className={`${
          mobileView === "editor" ? "hidden" : "flex"
        } w-full flex-col gap-3 md:flex md:w-72 md:shrink-0`}
      >
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Notes
          </h1>
          <button
            onClick={addNote}
            aria-label="New note"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white transition-opacity hover:opacity-90"
          >
            <Plus size={18} />
          </button>
        </div>

        <label className="flex items-center gap-2 rounded-xl border border-border bg-bg-elevated px-3 py-2 focus-within:border-border-strong">
          <Search size={16} className="text-text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes"
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-faint"
          />
        </label>

        <div className="flex-1 space-y-1 overflow-y-auto pr-1">
          {filteredNotes.map((note) => (
            <button
              key={note.id}
              onClick={() => {
                setActiveId(note.id);
                setMobileView("editor");
              }}
              className={`flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                note.id === activeNote?.id
                  ? "border-border-strong bg-bg-elevated"
                  : "border-transparent hover:bg-bg-sunken"
              }`}
            >
              <span className="truncate text-sm font-medium">
                {note.title || "Untitled note"}
              </span>
              <span className="truncate text-xs text-text-muted">
                {note.body || "No additional text"}
              </span>
              <span className="text-[11px] text-text-faint">
                {formatDate(note.updatedAt)}
              </span>
            </button>
          ))}
          {status === "idle" && filteredNotes.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              {query ? "No matches." : "No notes yet."}
            </p>
          )}
        </div>
      </aside>

      {/* Editor pane */}
      <section
        className={`${
          mobileView === "list" ? "hidden" : "flex"
        } flex-1 flex-col rounded-2xl border border-border bg-bg-elevated md:flex`}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <button
            onClick={() => setMobileView("list")}
            className="flex items-center gap-1 text-sm text-text-muted md:hidden"
          >
            <ChevronLeft size={18} /> Notes
          </button>

          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            {status === "error" ? <CloudOff size={15} /> : <Cloud size={15} />}
            <span>
              {status === "loading"
                ? "Loading"
                : status === "saving"
                  ? "Saving"
                  : status === "error"
                    ? "Offline"
                    : "Saved"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="mr-1 flex items-center gap-1 text-xs text-text-muted">
              <button
                onClick={() => changeFontSize("smaller")}
                disabled={fontSize === minFontSize}
                aria-label="Smaller font"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-bg-sunken disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="tabular-nums">{fontSize}</span>
              <button
                onClick={() => changeFontSize("larger")}
                disabled={fontSize === maxFontSize}
                aria-label="Larger font"
                className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-bg-sunken disabled:opacity-40"
              >
                <PlusIcon size={14} />
              </button>
            </div>
            <button
              onClick={deleteActiveNote}
              disabled={!activeNote}
              aria-label="Delete note"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken hover:text-accent-text disabled:opacity-40"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {status === "error" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center text-text-muted">
            <CloudOff size={30} />
            <p className="text-sm">{message || "Unable to load notes."}</p>
          </div>
        ) : status === "loading" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
            <FileText size={30} />
            <p className="text-sm">Loading</p>
          </div>
        ) : activeNote ? (
          <div className="flex flex-1 flex-col overflow-hidden px-4 py-3 md:px-6 md:py-5">
            <input
              value={activeNote.title}
              onChange={(e) => updateActiveNote({ title: e.target.value })}
              placeholder="Untitled note"
              aria-label="Note title"
              className="bg-transparent font-display text-xl font-semibold tracking-tight outline-none placeholder:text-text-faint"
            />
            <p className="mt-0.5 text-xs text-text-faint">
              Updated {formatDate(activeNote.updatedAt)}
            </p>
            <textarea
              value={activeNote.body}
              onChange={(e) => updateActiveNote({ body: e.target.value })}
              placeholder="Start typing..."
              aria-label="Note body"
              style={{ fontSize }}
              className="mt-4 flex-1 resize-none bg-transparent leading-relaxed outline-none placeholder:text-text-faint"
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-text-muted">
            <FileText size={30} />
            <p className="text-sm">Select or create a note</p>
            <button
              onClick={addNote}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              New note
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
