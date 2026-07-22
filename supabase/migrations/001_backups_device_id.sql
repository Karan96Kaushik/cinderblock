-- Migration: scope backups to account + device
-- Run in the Supabase SQL editor if user_backups already exists without device_id.

alter table public.user_backups
  add column if not exists device_id text;

-- Backfill any legacy rows so the column can be required
update public.user_backups
set device_id = 'legacy-unscoped'
where device_id is null or device_id = '';

alter table public.user_backups
  alter column device_id set not null;

drop index if exists public.user_backups_user_id_created_at_idx;

create index if not exists user_backups_user_device_created_at_idx
  on public.user_backups (user_id, device_id, created_at desc);
