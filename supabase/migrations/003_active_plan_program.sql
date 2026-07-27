-- Active plan payload now includes the gym program (foundation-7-june by default)
-- plus the running preset. Legacy rows that only stored RunningPlan remain valid;
-- the app normalizes them on read and re-upserts the full shape.

alter table public.user_active_plan
  alter column plan set default '{"programId":"foundation-7-june","running":{"warmupMinutes":5,"runMinutes":30,"cooldownMinutes":5}}'::jsonb;
