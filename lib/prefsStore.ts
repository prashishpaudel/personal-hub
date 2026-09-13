// Small cross-device settings, stored as one JSON blob per user so adding a
// preference needs no migration. Anything that only matters on this device
// (theme, rail collapsed) stays in localStorage instead.
import { supabase } from "@/lib/supabase";

export type GardenSort = "recent" | "name";

export type Prefs = {
  gardenSort?: GardenSort;
};

// Module state lives for the SPA session, so navigating back to a page that
// reads prefs renders the right thing immediately instead of flashing the
// default while a round trip completes.
let cache: Prefs | null = null;

export function getCachedPrefs(): Prefs | null {
  return cache;
}

export async function loadPrefs(): Promise<Prefs> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from("user_prefs")
    .select("prefs")
    .maybeSingle();
  if (error) throw new Error(error.message);
  cache = ((data?.prefs as Prefs | undefined) ?? {}) as Prefs;
  return cache;
}

// Merges into whatever is cached, so writing one key never drops another.
export async function savePref<K extends keyof Prefs>(
  key: K,
  value: Prefs[K]
): Promise<void> {
  cache = { ...(cache ?? {}), [key]: value };
  if (!supabase) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("user_prefs").upsert(
    {
      user_id: user.id,
      prefs: cache,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
  if (error) throw new Error(error.message);
}
