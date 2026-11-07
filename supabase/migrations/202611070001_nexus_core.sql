-- NEXUS Progress Tracker: one team per college, leader owned counts.
-- Run once in a dedicated Supabase project. Passwords live only in Supabase Auth.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.-]{3,32}$'),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  role text not null check (role in ('admin', 'leader')),
  created_at timestamptz not null default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) between 1 and 120),
  leader_name text not null check (length(btrim(leader_name)) between 1 and 120),
  leader_user_id uuid unique references auth.users(id) on delete set null,
  member_names text[] not null default '{}',
  target integer not null check (target > 0),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.colleges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  team_id uuid references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index colleges_name_ci_idx on public.colleges (lower(btrim(name)));
create index colleges_team_id_idx on public.colleges (team_id);
create index teams_active_idx on public.teams (archived_at) where archived_at is null;

create table public.team_counts (
  team_id uuid primary key references public.teams(id) on delete cascade,
  interested integer not null default 0 check (interested >= 0),
  registered_unpaid integer not null default 0 check (registered_unpaid >= 0),
  confirmed_paid integer not null default 0 check (confirmed_paid >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = (select auth.uid()) and role = 'admin'
  );
$$;

create or replace function private.leads_team(p_team_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.teams
    where id = p_team_id and leader_user_id = (select auth.uid())
      and archived_at is null
  );
$$;

revoke all on function private.is_admin() from public, anon;
revoke all on function private.leads_team(uuid) from public, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.leads_team(uuid) to authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function private.touch_counts()
returns trigger language plpgsql set search_path = ''
as $$ begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end $$;

create or replace function private.initialize_counts()
returns trigger language plpgsql security definer set search_path = ''
as $$ begin
  insert into public.team_counts(team_id) values (new.id);
  return new;
end $$;

create trigger teams_touch before update on public.teams
for each row execute function private.touch_updated_at();
create trigger colleges_touch before update on public.colleges
for each row execute function private.touch_updated_at();
create trigger counts_touch before update on public.team_counts
for each row execute function private.touch_counts();
create trigger teams_initialize_counts after insert on public.teams
for each row execute function private.initialize_counts();

alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.colleges enable row level security;
alter table public.team_counts enable row level security;

create policy profiles_read on public.profiles for select to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy teams_read on public.teams for select to authenticated
using ((select private.is_admin()) or leader_user_id = (select auth.uid()));
create policy teams_insert on public.teams for insert to authenticated
with check ((select private.is_admin()));
create policy teams_update on public.teams for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy colleges_read on public.colleges for select to authenticated
using ((select private.is_admin()) or (select private.leads_team(team_id)));
create policy colleges_insert on public.colleges for insert to authenticated
with check ((select private.is_admin()));
create policy colleges_update on public.colleges for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));

create policy counts_read on public.team_counts for select to authenticated
using ((select private.is_admin()) or (select private.leads_team(team_id)));
create policy counts_leader_update on public.team_counts for update to authenticated
using ((select private.leads_team(team_id)))
with check ((select private.leads_team(team_id)));

revoke all on public.profiles, public.teams, public.colleges, public.team_counts
  from public, anon, authenticated;
grant select on public.profiles, public.teams, public.colleges, public.team_counts
  to authenticated;
-- Leader identity is linked only by the checked admin-leaders function.
-- Admins can edit team details but cannot make themselves a leader to alter counts.
grant insert (name, leader_name, member_names, target) on public.teams to authenticated;
grant update (name, leader_name, member_names, target, archived_at)
  on public.teams to authenticated;
grant insert, update on public.colleges to authenticated;
grant update (interested, registered_unpaid, confirmed_paid)
  on public.team_counts to authenticated;

-- Realtime sends saved changes, filtered by the same SELECT policies.
do $$ begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'team_counts') then
    alter publication supabase_realtime add table public.team_counts;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'teams') then
    alter publication supabase_realtime add table public.teams;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public'
                   and tablename = 'colleges') then
    alter publication supabase_realtime add table public.colleges;
  end if;
end $$;
