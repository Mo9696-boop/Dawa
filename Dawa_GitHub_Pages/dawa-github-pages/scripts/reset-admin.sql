-- Recovery only: run manually in the Supabase SQL Editor.
-- Preserves medication history and patient device sessions.
update public.dawa_store
set data=jsonb_set(
  jsonb_set(data,'{auth,admin}','null'::jsonb),
  '{auth,sessions}',
  coalesce((select jsonb_agg(s) from jsonb_array_elements(data#>'{auth,sessions}') s where s->>'role'<>'admin'),'[]'::jsonb)
),version=version+1
where id=1 and data is not null;
