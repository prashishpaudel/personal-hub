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
-- Media sections — user-defined groups for videos (e.g. Business, Meditation)
-- ---------------------------------------------------------------------------
create table if not exists public.media_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists media_sections_user_idx
  on public.media_sections (user_id);

alter table public.media_sections enable row level security;

drop policy if exists "Owner can read media sections" on public.media_sections;
create policy "Owner can read media sections"
  on public.media_sections for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert media sections" on public.media_sections;
create policy "Owner can insert media sections"
  on public.media_sections for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update media sections" on public.media_sections;
create policy "Owner can update media sections"
  on public.media_sections for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete media sections" on public.media_sections;
create policy "Owner can delete media sections"
  on public.media_sections for delete to authenticated
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
  is_course boolean not null default false, -- youtube playlist expanded into lessons
  section_id uuid references public.media_sections (id) on delete set null,
  progress_seconds integer not null default 0, -- resume position (YouTube)
  progress_video_id text, -- last-played lesson within a course
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

drop policy if exists "Owner can update media" on public.media_items;
create policy "Owner can update media"
  on public.media_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete media" on public.media_items;
create policy "Owner can delete media"
  on public.media_items for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Media lessons — individual videos of a course (a YouTube playlist expanded
-- via the Data API). Each row is one lesson with a watched checkbox.
-- ---------------------------------------------------------------------------
create table if not exists public.media_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  media_id uuid not null references public.media_items (id) on delete cascade,
  video_id text not null,
  title text not null default '',
  position integer not null default 0,
  watched boolean not null default false,
  watched_at timestamptz,
  created_at timestamptz not null default now(),
  unique (media_id, video_id)
);

create index if not exists media_lessons_media_idx
  on public.media_lessons (media_id, position);

alter table public.media_lessons enable row level security;

drop policy if exists "Owner can read lessons" on public.media_lessons;
create policy "Owner can read lessons"
  on public.media_lessons for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert lessons" on public.media_lessons;
create policy "Owner can insert lessons"
  on public.media_lessons for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update lessons" on public.media_lessons;
create policy "Owner can update lessons"
  on public.media_lessons for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete lessons" on public.media_lessons;
create policy "Owner can delete lessons"
  on public.media_lessons for delete to authenticated
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

-- ---------------------------------------------------------------------------
-- Saved articles — bookmarks from the Feed reader. Stores a snapshot of the
-- article so it still renders after it ages out of the source feed, and syncs
-- across devices (replaces the old localStorage-only favorites).
-- ---------------------------------------------------------------------------
create table if not exists public.saved_articles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  link text not null,
  title text not null default '',
  source text not null default '',
  source_domain text not null default '',
  category text not null default '',
  summary text not null default '',
  image text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, link)
);

create index if not exists saved_articles_user_created_idx
  on public.saved_articles (user_id, created_at desc);

alter table public.saved_articles enable row level security;

drop policy if exists "Owner can read saved" on public.saved_articles;
create policy "Owner can read saved"
  on public.saved_articles for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert saved" on public.saved_articles;
create policy "Owner can insert saved"
  on public.saved_articles for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete saved" on public.saved_articles;
create policy "Owner can delete saved"
  on public.saved_articles for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Site bookmarks — sites without RSS worth revisiting (Feed "Sites" library)
-- ---------------------------------------------------------------------------
create table if not exists public.site_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null default '',
  url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, url)
);

create index if not exists site_bookmarks_user_created_idx
  on public.site_bookmarks (user_id, created_at desc);

alter table public.site_bookmarks enable row level security;

drop policy if exists "Owner can read site bookmarks" on public.site_bookmarks;
create policy "Owner can read site bookmarks"
  on public.site_bookmarks for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert site bookmarks" on public.site_bookmarks;
create policy "Owner can insert site bookmarks"
  on public.site_bookmarks for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete site bookmarks" on public.site_bookmarks;
create policy "Owner can delete site bookmarks"
  on public.site_bookmarks for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Sticky sections — user-defined groups shown as tabs on the sticky board
-- ---------------------------------------------------------------------------
create table if not exists public.sticky_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  pinned boolean not null default false,
  position double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sticky_sections_user_position_idx
  on public.sticky_sections (user_id, position);

alter table public.sticky_sections enable row level security;

drop policy if exists "Owner can read sticky sections" on public.sticky_sections;
create policy "Owner can read sticky sections"
  on public.sticky_sections for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert sticky sections" on public.sticky_sections;
create policy "Owner can insert sticky sections"
  on public.sticky_sections for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update sticky sections" on public.sticky_sections;
create policy "Owner can update sticky sections"
  on public.sticky_sections for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete sticky sections" on public.sticky_sections;
create policy "Owner can delete sticky sections"
  on public.sticky_sections for delete to authenticated
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Sticky notes — quick disposable cards on a drag-sortable board
-- ---------------------------------------------------------------------------
create table if not exists public.sticky_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body text not null default '',
  kind text not null default 'text' check (kind in ('text', 'list')),
  items jsonb not null default '[]', -- checklist rows: [{ id, text, done }]
  color text not null default 'plain',
  pinned boolean not null default false,
  section_id uuid references public.sticky_sections (id) on delete set null,
  position double precision not null default 0,
  deleted_at timestamptz, -- soft delete: set = in trash, null = on the board
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sticky_notes_user_position_idx
  on public.sticky_notes (user_id, position);

alter table public.sticky_notes enable row level security;

drop policy if exists "Owner can read stickies" on public.sticky_notes;
create policy "Owner can read stickies"
  on public.sticky_notes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Owner can insert stickies" on public.sticky_notes;
create policy "Owner can insert stickies"
  on public.sticky_notes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Owner can update stickies" on public.sticky_notes;
create policy "Owner can update stickies"
  on public.sticky_notes for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Owner can delete stickies" on public.sticky_notes;
create policy "Owner can delete stickies"
  on public.sticky_notes for delete to authenticated
  using (auth.uid() = user_id);
