-- Dedicated project recommended. Public browser keys have no data privileges.
create table public.dawa_store (
  id integer primary key check (id=1),
  version bigint not null default 0,
  data jsonb
);
insert into public.dawa_store(id,version,data) values(1,0,null);
create table public.dawa_limits (
  key text primary key,
  count integer not null,
  resets_at timestamptz not null
);
alter table public.dawa_store enable row level security;
alter table public.dawa_limits enable row level security;
revoke all on public.dawa_store,public.dawa_limits from public,anon,authenticated;
grant select,insert,update,delete on public.dawa_store,public.dawa_limits to service_role;

create function public.dawa_commit(expected_version bigint,next_data jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.dawa_store set data=next_data,version=version+1 where id=1 and version=expected_version;
  get diagnostics changed=row_count;
  return changed=1;
end;$$;

create function public.dawa_allow(limit_key text,maximum integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_count integer;
begin
  if maximum<1 or maximum>100 then return false; end if;
  insert into public.dawa_limits as existing(key,count,resets_at)
    values(limit_key,1,now()+interval '15 minutes')
  on conflict(key) do update set
    count=case when existing.resets_at<=now() then 1 else existing.count+1 end,
    resets_at=case when existing.resets_at<=now() then now()+interval '15 minutes' else existing.resets_at end
  returning count into current_count;
  return current_count<=maximum;
end;$$;
revoke all on function public.dawa_commit(bigint,jsonb) from public,anon,authenticated;
revoke all on function public.dawa_allow(text,integer) from public,anon,authenticated;
grant execute on function public.dawa_commit(bigint,jsonb) to service_role;
grant execute on function public.dawa_allow(text,integer) to service_role;
