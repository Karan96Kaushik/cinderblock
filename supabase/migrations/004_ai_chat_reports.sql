-- AI workout chat hard-failure reports (written by Amplify report-issue Lambda with service role).
create table if not exists public.ai_chat_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  chat_history jsonb,
  plaintext_draft text,
  running_summary text,
  json_attempts jsonb,
  validator_errors jsonb,
  schema_version text
);

create index if not exists ai_chat_reports_user_created_at_idx
  on public.ai_chat_reports (user_id, created_at desc);

alter table public.ai_chat_reports enable row level security;

-- No insert/select policies for authenticated users — inserts use the service role.
-- Optional admin read: grant yourself via dashboard SQL as needed.
