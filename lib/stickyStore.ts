// Sticky notes — quick disposable cards. Thin wrappers over the browser
// Supabase client. Ordering is a float `position` (ascending); a card dropped
// between two others takes the midpoint, new cards go on top (min - 1).
import { supabase } from "@/lib/supabase";

export type StickyColor =
  | "plain"
  | "stone"
  | "amber"
  | "peach"
  | "rose"
  | "blossom"
  | "lilac"
  | "sky"
  | "mint"
  | "sage";
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
  deletedAt: string | null;
};

export type StickySection = {
  id: string;
  name: string;
  pinned: boolean;
  position: number;
};

const cols =
  "id,body,kind,items,color,pinned,sectionId:section_id,position,deletedAt:deleted_at";

function client() {
  if (!supabase) throw new Error("Add Supabase env vars to use stickies.");
  return supabase;
}

export async function listStickies(): Promise<Sticky[]> {
  const { data, error } = await client()
    .from("sticky_notes")
    .select(cols)
    .is("deleted_at", null)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Sticky[];
}

export async function listStickyTrash(): Promise<Sticky[]> {
  const { data, error } = await client()
    .from("sticky_notes")
    .select(cols)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
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

// Move to trash — recoverable via restoreSticky.
export async function softDeleteSticky(id: string): Promise<void> {
  const { error } = await client()
    .from("sticky_notes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restoreSticky(id: string): Promise<void> {
  const { error } = await client()
    .from("sticky_notes")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Permanent removal — only from the Trash view.
export async function deleteSticky(id: string): Promise<void> {
  const { error } = await client().from("sticky_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// --- Sections ---------------------------------------------------------------

const sectionCols = "id,name,pinned,position";

export async function listSections(): Promise<StickySection[]> {
  const { data, error } = await client()
    .from("sticky_sections")
    .select(sectionCols)
    .order("pinned", { ascending: false })
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
    .select(sectionCols)
    .single();
  if (error) throw new Error(error.message);
  return data as StickySection;
}

export async function updateSection(
  id: string,
  patch: Partial<Pick<StickySection, "name" | "pinned">>
): Promise<void> {
  const { error } = await client()
    .from("sticky_sections")
    .update(patch)
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
