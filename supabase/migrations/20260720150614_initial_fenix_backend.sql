create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'AGENTE'
    check (role in ('TITOLARE','ASSOCIATO','COORDINATORE/TRICE','AGENTE','TELEFONISTA','SVILUPPATORE')),
  manager_id uuid references public.profiles(id) on delete set null,
  status text not null default 'Attivo' check (status in ('Attivo','Sospeso')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text,
  title text not null,
  status text not null default 'Bozza',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  contact_type text,
  status text,
  next_contact_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  title text not null,
  activity_type text,
  status text not null default 'Pianificata',
  priority text not null default 'media' check (priority in ('alta','media','bassa')),
  starts_at timestamptz,
  ends_at timestamptz,
  outcome text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  period_start date not null,
  period_end date not null,
  current_value numeric not null default 0,
  target_value numeric not null check (target_value > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pws_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  focus text not null default '',
  daily_goals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, plan_date)
);

create table public.pws_tasks (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.pws_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source text not null check (source in ('crm','manuale')),
  source_type text check (source_type in ('attivita','contatto','immobile') or source_type is null),
  source_id uuid,
  title text not null,
  note text not null default '',
  starts_at timestamptz,
  duration_minutes integer not null default 30 check (duration_minutes between 5 and 1440),
  priority text not null default 'media' check (priority in ('alta','media','bassa')),
  status text not null default 'pianificata'
    check (status in ('proposta','pianificata','in_corso','completata','rinviata','rifiutata')),
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.telefonista_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_agent_id uuid references public.profiles(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  outcome text not null,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  notes text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activities_user_starts_idx on public.activities(user_id, starts_at);
create index contacts_user_next_contact_idx on public.contacts(user_id, next_contact_at);
create index pws_tasks_plan_starts_idx on public.pws_tasks(plan_id, starts_at);
create index telefonista_calls_agent_created_idx on public.telefonista_calls(assigned_agent_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.properties enable row level security;
alter table public.contacts enable row level security;
alter table public.requests enable row level security;
alter table public.activities enable row level security;
alter table public.goals enable row level security;
alter table public.pws_plans enable row level security;
alter table public.pws_tasks enable row level security;
alter table public.telefonista_calls enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy properties_own on public.properties for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy contacts_own on public.contacts for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy requests_own on public.requests for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy activities_own on public.activities for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy goals_own on public.goals for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pws_plans_own on public.pws_plans for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy pws_tasks_own on public.pws_tasks for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy telefonista_calls_own on public.telefonista_calls for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles, public.properties, public.contacts, public.requests,
  public.activities, public.goals, public.pws_plans, public.pws_tasks,
  public.telefonista_calls
to authenticated;

revoke all on all tables in schema public from anon;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
