-- Live training log sync (gym + runs + metrics), one row per account + device.
-- Run in the Supabase SQL editor if this table is not already present.

create table if not exists public.user_training_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  device_id text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

alter table public.user_training_logs enable row level security;

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
