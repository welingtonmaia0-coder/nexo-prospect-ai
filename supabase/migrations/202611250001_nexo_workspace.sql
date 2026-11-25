begin;
create table public.nexo_workspaces (
  owner_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  revision bigint not null default 1,
  payload jsonb not null check (
    jsonb_typeof(payload) = 'object' and
    payload ?& array['version','profile','services','drafts'] and
    payload->'version' = '1'::jsonb and
    jsonb_typeof(payload->'profile') = 'object' and
    jsonb_typeof(payload->'services') = 'array' and
    jsonb_typeof(payload->'drafts') = 'array'
  )
);
alter table public.nexo_workspaces enable row level security;
revoke all on public.nexo_workspaces from public, anon, authenticated;
grant select, insert (payload), update (payload) on public.nexo_workspaces to authenticated;
create policy owner_read on public.nexo_workspaces for select to authenticated using (owner_id = (select auth.uid()));
create policy owner_create on public.nexo_workspaces for insert to authenticated with check (owner_id = (select auth.uid()));
create policy owner_save on public.nexo_workspaces for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create function public.nexo_increment_revision() returns trigger language plpgsql set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;
create trigger increment_revision before update on public.nexo_workspaces for each row execute function public.nexo_increment_revision();
commit;
