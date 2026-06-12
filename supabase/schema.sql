-- Personal Hub schema. Run in the Supabase SQL editor.
-- Single-user model: every row is owned by the signed-in user and
-- only that user can read or write it (enforced by RLS).

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default 'Untitled note',
  body text not null default '',
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated_idx
  on public.notes (user_id, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "Owner can read notes" on public.notes;
create policy "Owner can read notes"
  on public.notes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert notes" on public.notes;
create policy "Owner can insert notes"
  on public.notes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update notes" on public.notes;
create policy "Owner can update notes"
  on public.notes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete notes" on public.notes;
create policy "Owner can delete notes"
  on public.notes for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- RSS sources — feeds the user follows (managed from the Feed UI)
-- ---------------------------------------------------------------------------
create table if not exists public.rss_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  url text not null,
  category text not null default 'Tech',
  created_at timestamptz not null default now()
);

create index if not exists rss_sources_user_idx on public.rss_sources (user_id);

alter table public.rss_sources enable row level security;

drop policy if exists "Owner can read sources" on public.rss_sources;
create policy "Owner can read sources"
  on public.rss_sources for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert sources" on public.rss_sources;
create policy "Owner can insert sources"
  on public.rss_sources for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete sources" on public.rss_sources;
create policy "Owner can delete sources"
  on public.rss_sources for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Media items — videos / podcasts (managed from the Media UI)
-- ---------------------------------------------------------------------------
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null, -- youtube | spotify | apple-podcast
  url text not null,
  title text,
  created_at timestamptz not null default now()
);

create index if not exists media_items_user_idx
  on public.media_items (user_id, created_at desc);

alter table public.media_items enable row level security;

drop policy if exists "Owner can read media" on public.media_items;
create policy "Owner can read media"
  on public.media_items for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert media" on public.media_items;
create policy "Owner can insert media"
  on public.media_items for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete media" on public.media_items;
create policy "Owner can delete media"
  on public.media_items for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Blog posts — long-form writing (private; draft/published is a workflow
-- flag, deleted_at is a soft delete: rows only leave via manual DB action)
-- ---------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '',
  content_html text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  deleted_at timestamptz
);

create index if not exists blog_posts_user_updated_idx
  on public.blog_posts (user_id, updated_at desc);

alter table public.blog_posts enable row level security;

drop policy if exists "Owner can read posts" on public.blog_posts;
create policy "Owner can read posts"
  on public.blog_posts for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert posts" on public.blog_posts;
create policy "Owner can insert posts"
  on public.blog_posts for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update posts" on public.blog_posts;
create policy "Owner can update posts"
  on public.blog_posts for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete posts" on public.blog_posts;
create policy "Owner can delete posts"
  on public.blog_posts for delete to authenticated
  using (auth.uid() = user_id);
