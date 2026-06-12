// Client-side helpers for the blog_posts table. Thin typed wrappers over the
// browser Supabase client so the blog pages stay lean. RLS scopes every row
// to the signed-in user.
import { supabase } from "@/lib/supabase";

export type PostStatus = "draft" | "published";

export type Post = {
  id: string;
  title: string;
  contentHtml: string;
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  deletedAt: number | null;
};

type PostRow = {
  id: string;
  title: string;
  content_html: string;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

const cols =
  "id,title,content_html,status,created_at,updated_at,published_at,deleted_at";

function postFromRow(row: PostRow): Post {
  return {
    id: row.id,
    title: row.title,
    contentHtml: row.content_html,
    status: row.status,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    publishedAt: row.published_at ? new Date(row.published_at).getTime() : null,
    deletedAt: row.deleted_at ? new Date(row.deleted_at).getTime() : null,
  };
}

function client() {
  if (!supabase) throw new Error("Add Supabase env vars to use the blog.");
  return supabase;
}

// Active (non-deleted) posts, newest first.
export async function listPosts(): Promise<Post[]> {
  const { data, error } = await client()
    .from("blog_posts")
    .select(cols)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PostRow[]).map(postFromRow);
}

export async function listTrash(): Promise<Post[]> {
  const { data, error } = await client()
    .from("blog_posts")
    .select(cols)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as PostRow[]).map(postFromRow);
}

export async function getPost(id: string): Promise<Post | null> {
  const { data, error } = await client()
    .from("blog_posts")
    .select(cols)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? postFromRow(data as PostRow) : null;
}

export async function createDraft(): Promise<Post> {
  const { data, error } = await client()
    .from("blog_posts")
    .insert({})
    .select(cols)
    .single();
  if (error) throw new Error(error.message);
  return postFromRow(data as PostRow);
}

export async function updatePost(
  id: string,
  patch: Partial<Pick<Post, "title" | "contentHtml">>
): Promise<void> {
  const row: Record<string, string> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.contentHtml !== undefined) row.content_html = patch.contentHtml;
  const { error } = await client().from("blog_posts").update(row).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function publish(id: string): Promise<void> {
  const { error } = await client()
    .from("blog_posts")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function unpublish(id: string): Promise<void> {
  const { error } = await client()
    .from("blog_posts")
    .update({ status: "draft", published_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Soft delete — the row stays in the table (visible in Trash) and only
// leaves via manual DB action.
export async function softDelete(id: string): Promise<void> {
  const { error } = await client()
    .from("blog_posts")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function restore(id: string): Promise<void> {
  const { error } = await client()
    .from("blog_posts")
    .update({ deleted_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
