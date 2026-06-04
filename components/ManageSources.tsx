"use client";

import { useCallback, useEffect, useState } from "react";
import { X, Trash2, Plus, DownloadCloud, Loader2 } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { sources as defaultSources, categories } from "@/lib/sources";

type Source = {
  id: string;
  name: string;
  url: string;
  category: string;
};

export default function ManageSources({
  onClose,
  onChange,
}: {
  onClose: () => void;
  onChange: () => void;
}) {
  const [rows, setRows] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("rss_sources")
      .select("id,name,url,category")
      .order("name");
    setRows((data as Source[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !name.trim() || !url.trim()) return;
    setBusy(true);
    setError("");
    const { error } = await supabase
      .from("rss_sources")
      .insert({ name: name.trim(), url: url.trim(), category });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setName("");
    setUrl("");
    await load();
    onChange();
  }

  async function removeSource(id: string) {
    if (!supabase) return;
    setRows((cur) => cur.filter((s) => s.id !== id));
    await supabase.from("rss_sources").delete().eq("id", id);
    onChange();
  }

  async function importDefaults() {
    if (!supabase) return;
    setBusy(true);
    setError("");
    const existing = new Set(rows.map((r) => r.url));
    const toAdd = defaultSources.filter((s) => !existing.has(s.url));
    if (toAdd.length > 0) {
      const { error } = await supabase.from("rss_sources").insert(toAdd);
      if (error) {
        setBusy(false);
        setError(error.message);
        return;
      }
    }
    setBusy(false);
    await load();
    onChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
      />
      <div className="relative flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl border border-border bg-bg-elevated shadow-xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Manage feeds
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-sunken"
          >
            <X size={18} />
          </button>
        </header>

        <form
          onSubmit={addSource}
          className="space-y-2 border-b border-border p-4"
        >
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Source name"
              className="w-1/2 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-1/2 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-border-strong"
            />
            <button
              type="submit"
              disabled={busy || !name.trim() || !url.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {error && <p className="text-xs text-accent-text">{error}</p>}
        </form>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-muted">
              <Loader2 size={16} className="animate-spin" /> Loading
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-text-muted">
                No feeds yet. Import the bundled defaults to get started.
              </p>
              <button
                onClick={importDefaults}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-bg-sunken disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <DownloadCloud size={15} />
                )}
                Import {defaultSources.length} defaults
              </button>
            </div>
          ) : (
            <ul className="space-y-1">
              {rows.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-bg-sunken"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <p className="truncate text-xs text-text-faint">{s.url}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-bg-sunken px-2 py-0.5 text-[11px] text-text-muted">
                    {s.category}
                  </span>
                  <button
                    onClick={() => removeSource(s.id)}
                    aria-label={`Remove ${s.name}`}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-accent-text"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
