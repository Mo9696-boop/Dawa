create table public.dawa_settings(id integer primary key check(id=1),allowed_origin text not null,setup_key_hash text not null);
alter table public.dawa_settings enable row level security;
revoke all on public.dawa_settings from public,anon,authenticated;
grant select,insert,update on public.dawa_settings to service_role;
