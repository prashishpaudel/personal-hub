// Sticky notes — quick disposable cards. Thin wrappers over the browser
// Supabase client. Ordering is a float `position` (ascending); a card dropped
// between two others takes the midpoint, new cards go on top (min - 1).
import { supabase } from "@/lib/supabase";

export type StickyColor = "plain" | "amber" | "rose" | "sage" | "sky";
export type StickyKind = "text" | "list";

export type StickyItem = { id: string; text: string; done: boolean };

export type Sticky = {
  id: string;
  body: string;
  kind: StickyKind;
  items: StickyItem[];
  color: StickyColor;
  pinned: boolean;
  sectionId: string | null;
  position: number;
};

export type StickySection = {
  id: string;
  name: string;
  position: number;
};

const cols = "id,body,kind,items,color,pinned,sectionId:section_id,position";

function client() {
  if (!supabase) throw new Error("Add Supabase env vars to use stickies.");
  return supabase;
}

export async function listStickies(): Promise<Sticky[]> {
  const { data, error } = await client()
    .from("sticky_notes")
    .select(cols)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sticky[];
}

export async function createSticky(
  position: number,
  kind: StickyKind,
  sectionId: string | null = null
): Promise<Sticky> {
  const items =
    kind === "list" ? [{ id: crypto.randomUUID(), text: "", done: false }] : [];
  const { data, error } = await client()
    .from("sticky_notes")
    .insert({ position, kind, items, section_id: sectionId })
    .select(cols)
    .single();
  if (error) throw new Error(error.message);
  return data as Sticky;
}

export async function updateSticky(
  id: string,
  patch: Partial<
    Pick<
      Sticky,
      "body" | "kind" | "items" | "color" | "pinned" | "sectionId" | "position"
    >
  >
): Promise<void> {
  const { sectionId, ...rest } = patch;
  const row: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };
  if (sectionId !== undefined) row.section_id = sectionId;
  const { error } = await client()
    .from("sticky_notes")
    .update(row)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSticky(id: string): Promise<void> {
  const { error } = await client().from("sticky_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Sections ---------------------------------------------------------------

export async function listSections(): Promise<StickySection[]> {
  const { data, error } = await client()
    .from("sticky_sections")
    .select("id,name,position")
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as StickySection[];
}

export async function createSection(
  name: string,
  position: number
): Promise<StickySection> {
  const { data, error } = await client()
    .from("sticky_sections")
    .insert({ name, position })
    .select("id,name,position")
    .single();
  if (error) throw new Error(error.message);
  return data as StickySection;
}

export async function renameSection(id: string, name: string): Promise<void> {
  const { error } = await client()
    .from("sticky_sections")
    .update({ name })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Stickies in the section are unfiled (section_id set null by the FK), not deleted.
export async function deleteSection(id: string): Promise<void> {
  const { error } = await client()
    .from("sticky_sections")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}
