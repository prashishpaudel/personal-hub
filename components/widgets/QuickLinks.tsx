"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type Row = { id: string; name: string; url: string };

function Favicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Globe size={14} className="shrink-0 text-text-faint" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
      alt=""
      className="h-3.5 w-3.5 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}

// Top links as a quick-access chip row on the dashboard.
export default function QuickLinks() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    supabase
      .from("link_bookmarks")
      .select("id,name,url")
      .order("position", { ascending: true })
      .limit(8)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  if (rows.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {rows.map((l) => {
        let domain = l.url;
        try {
          domain = new URL(l.url).hostname.replace(/^www\./, "");
        } catch {
          /* keep raw */
        }
        return (
          <a
            key={l.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            <Favicon domain={domain} />
            {l.name}
          </a>
        );
      })}
    </div>
  );
}
