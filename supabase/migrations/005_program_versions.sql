-- Append-only history of gym program versions per user.
-- user_active_plan continues to hold the currently active program;
-- this table tracks every saved revision for audit / restore later.

create table if not exists public.user_program_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id text not null,
  version text not null,
  program jsonb not null,
  source text not null default 'cloud-sync',
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, program_id, version)
);

create index if not exists user_program_versions_user_created_at_idx
  on public.user_program_versions (user_id, created_at desc);

create index if not exists user_program_versions_user_program_id_idx
  on public.user_program_versions (user_id, program_id, created_at desc);

alter table public.user_program_versions enable row level security;

create policy "Users can read own program versions"
  on public.user_program_versions for select
  using (auth.uid() = user_id);

create policy "Users can insert own program versions"
  on public.user_program_versions for insert
  with check (auth.uid() = user_id);

-- No update/delete policies: versions are immutable once written.
