// Course lessons — the individual videos of a YouTube playlist, each with a
// watched flag. Thin wrappers over the browser Supabase client.
import { supabase } from "@/lib/supabase";

export type Lesson = {
  id: string;
  media_id: string;
  video_id: string;
  title: string;
  position: number;
  watched: boolean;
};

const cols = "id,media_id,video_id,title,position,watched";

export async function listLessons(mediaIds: string[]): Promise<Lesson[]> {
  if (!supabase || mediaIds.length === 0) return [];
  const { data, error } = await supabase
    .from("media_lessons")
    .select(cols)
    .in("media_id", mediaIds)
    .order("position", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Lesson[];
}

export async function setLessonWatched(
  id: string,
  watched: boolean
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("media_lessons")
    .update({ watched, watched_at: watched ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Fetch the playlist's videos via our API route and store them as lessons.
export async function expandPlaylist(
  mediaId: string,
  listId: string
): Promise<void> {
  const res = await fetch(
    `/api/youtube/playlist?list=${encodeURIComponent(listId)}`
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Failed to load playlist");
  const rows = (
    json.lessons as { videoId: string; title: string; position: number }[]
  ).map((l) => ({
    media_id: mediaId,
    video_id: l.videoId,
    title: l.title,
    position: l.position,
  }));
  if (!supabase || rows.length === 0) return;
  const { error } = await supabase.from("media_lessons").insert(rows);
  if (error) throw new Error(error.message);
}
