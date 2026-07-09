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
  position: number;
};

const cols = "id,body,kind,items,color,position";

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
  kind: StickyKind
): Promise<Sticky> {
  const items =
    kind === "list" ? [{ id: crypto.randomUUID(), text: "", done: false }] : [];
  const { data, error } = await client()
    .from("sticky_notes")
    .insert({ position, kind, items })
    .select(cols)
    .single();
  if (error) throw new Error(error.message);
  return data as Sticky;
}

export async function updateSticky(
  id: string,
  patch: Partial<Pick<Sticky, "body" | "kind" | "items" | "color" | "position">>
): Promise<void> {
  const { error } = await client()
    .from("sticky_notes")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteSticky(id: string): Promise<void> {
  const { error } = await client().from("sticky_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
