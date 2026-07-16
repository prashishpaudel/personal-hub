// Link bookmarks — general link keeper (repos, tools, references) with an
// optional note. Backs the top-level Links section.
import { supabase } from "@/lib/supabase";

export type LinkBookmark = {
  id: string;
  name: string;
  url: string;
  note: string;
};

const cols = "id,name,url,note";

function client() {
  if (!supabase) throw new Error("Add Supabase env vars to use links.");
  return supabase;
}

// In-memory cache so returning to /links renders instantly and refreshes in
// the background (module state lives for the SPA session).
let cache: LinkBookmark[] | null = null;

export function getLinkCache(): LinkBookmark[] | null {
  return cache;
}

export function setLinkCache(next: LinkBookmark[]) {
  cache = next;
}

export async function listLinks(): Promise<LinkBookmark[]> {
  const { data, error } = await client()
    .from("link_bookmarks")
    .select(cols)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as LinkBookmark[];
}

export async function addLink(
  name: string,
  url: string,
  note: string
): Promise<LinkBookmark> {
  const { data, error } = await client()
    .from("link_bookmarks")
    .insert({ name, url, note })
    .select(cols)
    .single();
  if (error) throw new Error(error.message);
  return data as LinkBookmark;
}

export async function updateLink(
  id: string,
  patch: Partial<Pick<LinkBookmark, "name" | "note">>
): Promise<void> {
  const { error } = await client()
    .from("link_bookmarks")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeLink(id: string): Promise<void> {
  const { error } = await client()
    .from("link_bookmarks")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
