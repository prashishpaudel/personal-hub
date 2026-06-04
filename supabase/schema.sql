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
