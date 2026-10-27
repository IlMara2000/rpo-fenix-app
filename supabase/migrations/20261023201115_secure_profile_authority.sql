-- Roles, suspension and management relationships are administrator-owned.
revoke insert, update, delete on public.profiles from authenticated;
grant insert (id, email, full_name) on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;

drop policy profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id and role = 'AGENTE'
    and status = 'Attivo' and manager_id is null);

-- Suspended profiles must not keep access through a still-valid JWT.
do $$
declare table_name text;
begin
  foreach table_name in array array['properties','contacts','requests','activities',
    'goals','pws_plans','pws_tasks','telefonista_calls'] loop
    execute format('create policy active_profile_required on public.%I as restrictive for all to authenticated using (exists (select 1 from public.profiles where id = (select auth.uid()) and status = ''Attivo'')) with check (exists (select 1 from public.profiles where id = (select auth.uid()) and status = ''Attivo''))', table_name);
  end loop;
end $$;

create policy own_plan_required on public.pws_tasks as restrictive for all to authenticated
  using (exists (select 1 from public.pws_plans where id = plan_id and user_id = (select auth.uid())))
  with check (exists (select 1 from public.pws_plans where id = plan_id and user_id = (select auth.uid())));

-- Atomic daily allowance shared across serverless instances.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table private.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  requests integer not null,
  primary key (user_id, usage_date)
);
alter table private.ai_daily_usage enable row level security;
revoke all on private.ai_daily_usage from public, anon, authenticated;
create function private.consume_generation_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare accepted integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and status = 'Attivo'
  ) then return false; end if;
  insert into private.ai_daily_usage as usage (user_id, usage_date, requests)
  values (auth.uid(), (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, usage_date) do update set requests = usage.requests + 1
    where usage.requests < 10
  returning requests into accepted;
  return accepted is not null;
end $$;
revoke all on function private.consume_generation_quota() from public, anon;
grant execute on function private.consume_generation_quota() to authenticated;
create function public.consume_generation_quota() returns boolean
language sql security invoker set search_path = '' as $$
  select private.consume_generation_quota();
$$;
revoke all on function public.consume_generation_quota() from public, anon;
grant execute on function public.consume_generation_quota() to authenticated;
