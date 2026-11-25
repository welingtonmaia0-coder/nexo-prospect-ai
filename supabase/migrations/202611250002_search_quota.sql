begin;
create table public.nexo_search_usage (
  owner_id uuid references auth.users(id) on delete cascade,
  day date not null,
  count integer not null check(count between 1 and 5),
  primary key(owner_id,day)
);
alter table public.nexo_search_usage enable row level security;
revoke all on public.nexo_search_usage from public,anon,authenticated;
create function public.nexo_reserve_search() returns boolean
language plpgsql security definer set search_path = '' as $$
declare reserved integer;
begin
  if auth.uid() is null then return false; end if;
  insert into public.nexo_search_usage values(auth.uid(),(now() at time zone 'UTC')::date,1)
  on conflict(owner_id,day) do update set count=nexo_search_usage.count+1
  where nexo_search_usage.count<5 returning count into reserved;
  return reserved is not null;
end;
$$;
revoke all on function public.nexo_reserve_search() from public,anon;
grant execute on function public.nexo_reserve_search() to authenticated;
commit;
