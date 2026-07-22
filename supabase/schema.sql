-- Cinderblock PWA — Supabase schema
-- Run in the Supabase SQL editor after creating your project.

-- App appearance / configuration
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- User's active running plan (warmup · run · cooldown)
create table if not exists public.user_active_plan (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan jsonb not null default '{"warmupMinutes":5,"runMinutes":30,"cooldownMinutes":5}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Full training log backups — scoped to account + device (not shared across accounts or devices)
create table if not exists public.user_backups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  payload jsonb not null,
  label text,
  created_at timestamptz not null default now()
);

create index if not exists user_backups_user_device_created_at_idx
  on public.user_backups (user_id, device_id, created_at desc);

-- Live training log sync (gym + runs + metrics) — one row per account + device
create table if not exists public.user_training_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table public.user_settings enable row level security;
alter table public.user_active_plan enable row level security;
alter table public.user_backups enable row level security;
alter table public.user_training_logs enable row level security;

-- user_settings policies
create policy "Users can read own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own settings"
  on public.user_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own settings"
  on public.user_settings for delete
  using (auth.uid() = user_id);

-- user_active_plan policies
create policy "Users can read own active plan"
  on public.user_active_plan for select
  using (auth.uid() = user_id);

create policy "Users can insert own active plan"
  on public.user_active_plan for insert
  with check (auth.uid() = user_id);

create policy "Users can update own active plan"
  on public.user_active_plan for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own active plan"
  on public.user_active_plan for delete
  using (auth.uid() = user_id);

-- user_backups policies (account-scoped; app also filters by device_id)
create policy "Users can read own backups"
  on public.user_backups for select
  using (auth.uid() = user_id);

create policy "Users can insert own backups"
  on public.user_backups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own backups"
  on public.user_backups for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own backups"
  on public.user_backups for delete
  using (auth.uid() = user_id);

-- user_training_logs policies
create policy "Users can read own training logs"
  on public.user_training_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own training logs"
  on public.user_training_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own training logs"
  on public.user_training_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own training logs"
  on public.user_training_logs for delete
  using (auth.uid() = user_id);
