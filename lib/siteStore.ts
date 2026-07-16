// Site bookmarks — sites without an RSS feed worth revisiting. Shown in the
// Feed sidebar as the "Sites" library.
import { supabase } from "@/lib/supabase";

export type Site = {
  id: string;
  name: string;
  url: string;
  position: number;
};

const cols = "id,name,url,position";

export async function listSites(): Promise<Site[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("site_bookmarks")
    .select(cols)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Site[];
}

export async function addSite(
  name: string,
  url: string,
  position: number
): Promise<Site> {
  if (!supabase) throw new Error("Add Supabase env vars to save sites.");
  const { data, error } = await supabase
    .from("site_bookmarks")
    .insert({ name, url, position })
    .select(cols)
    .single();
  if (error) throw new Error(error.message);
  return data as Site;
}

export async function updateSitePosition(
  id: string,
  position: number
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("site_bookmarks")
    .update({ position })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeSite(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("site_bookmarks")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
