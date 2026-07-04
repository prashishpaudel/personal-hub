// Saved articles ("bookmarks") backed by Supabase so they sync across devices
// and survive an article ageing out of its source feed. We store a snapshot of
// the feed item (minus the heavy fullContent, which "Read in app" re-fetches).
import { supabase } from "@/lib/supabase";
import type { FeedItem } from "@/lib/feedStore";

type SavedRow = {
  link: string;
  title: string;
  source: string;
  source_domain: string;
  category: string;
  summary: string;
  image: string | null;
  published_at: string | null;
};

const cols =
  "link,title,source,source_domain,category,summary,image,published_at";

function rowToItem(row: SavedRow): FeedItem {
  return {
    title: row.title,
    link: row.link,
    date: row.published_at ?? new Date(0).toISOString(),
    source: row.source,
    sourceDomain: row.source_domain,
    category: row.category,
    summary: row.summary,
    fullContent: null,
    image: row.image,
  };
}

function itemToRow(item: FeedItem): SavedRow {
  return {
    link: item.link,
    title: item.title,
    source: item.source,
    source_domain: item.sourceDomain,
    category: item.category,
    summary: item.summary,
    image: item.image,
    published_at: item.date ? new Date(item.date).toISOString() : null,
  };
}

// Newest-saved first. Returns [] when Supabase isn't configured so the feed
// still works without bookmarks.
export async function listSaved(): Promise<FeedItem[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("saved_articles")
    .select(cols)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as SavedRow[]).map(rowToItem);
}

export async function addSaved(item: FeedItem): Promise<void> {
  if (!supabase) return;
  // Insert-or-ignore on (user_id, link) so re-saving is idempotent without
  // needing an UPDATE policy (ignoreDuplicates → ON CONFLICT DO NOTHING).
  const { error } = await supabase
    .from("saved_articles")
    .upsert(itemToRow(item), {
      onConflict: "user_id,link",
      ignoreDuplicates: true,
    });
  if (error) throw new Error(error.message);
}

export async function removeSaved(link: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("saved_articles")
    .delete()
    .eq("link", link);
  if (error) throw new Error(error.message);
}
