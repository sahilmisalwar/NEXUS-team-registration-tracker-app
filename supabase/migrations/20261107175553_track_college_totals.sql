-- Earlier entries changed team totals and cannot establish trustworthy college totals.
-- Keep those team totals as unallocated; track every future college total separately.
create table public.college_counts (
  team_id uuid not null references public.teams(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete restrict,
  interested integer not null default 0 check (interested >= 0),
  registered_unpaid integer not null default 0 check (registered_unpaid >= 0),
  confirmed_paid integer not null default 0 check (confirmed_paid >= 0),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (team_id, college_id)
);

create index college_counts_college_id_idx on public.college_counts (college_id);
create index count_entries_college_id_idx on public.count_entries (college_id);
create trigger college_counts_touch before update on public.college_counts
for each row execute function private.touch_counts();

alter table public.college_counts enable row level security;
create policy college_counts_read on public.college_counts for select to authenticated
using ((select private.is_admin()) or (select private.leads_team(team_id)));
revoke all on public.college_counts from public, anon, authenticated;
grant select on public.college_counts to authenticated;

-- Null snapshots identify historical entries that only recorded team totals.
alter table public.count_entries
  add column entry_kind text not null default 'update' check (entry_kind in ('update', 'allocation')),
  add column college_interested integer check (college_interested >= 0),
  add column college_registered_unpaid integer check (college_registered_unpaid >= 0),
  add column college_confirmed_paid integer check (college_confirmed_paid >= 0),
  add column previous_college_interested integer check (previous_college_interested >= 0),
  add column previous_college_registered_unpaid integer check (previous_college_registered_unpaid >= 0),
  add column previous_college_confirmed_paid integer check (previous_college_confirmed_paid >= 0),
  add constraint count_entries_college_snapshot_complete check (
    (college_interested is null and college_registered_unpaid is null and college_confirmed_paid is null
      and previous_college_interested is null and previous_college_registered_unpaid is null
      and previous_college_confirmed_paid is null)
    or
    (college_interested is not null and college_registered_unpaid is not null and college_confirmed_paid is not null
      and previous_college_interested is not null and previous_college_registered_unpaid is not null
      and previous_college_confirmed_paid is not null)
  );

-- A leader supplies the selected college's after-total and expected before-total.
-- This trigger atomically updates that college and changes the team by the same delta.
create or replace function private.record_count_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_college_name text;
  v_team public.team_counts%rowtype;
  v_college public.college_counts%rowtype;
  v_interested_delta integer;
  v_registered_delta integer;
  v_confirmed_delta integer;
  v_team_interested_delta integer;
  v_team_registered_delta integer;
  v_team_confirmed_delta integer;
  v_recorded_interested bigint;
  v_recorded_registered bigint;
  v_recorded_confirmed bigint;
begin
  select c.name into v_college_name
  from public.colleges c
  join public.teams t on t.id = c.team_id
  join public.profiles p on p.user_id = v_user
  where c.id = new.college_id and c.team_id = new.team_id
    and t.leader_user_id = v_user and t.archived_at is null
    and p.role = 'leader';
  if not found then
    raise exception 'Choose a college assigned to your team.' using errcode = '42501';
  end if;

  if new.college_interested is null or new.college_registered_unpaid is null
     or new.college_confirmed_paid is null then
    raise exception 'Enter totals for the selected college.' using errcode = '23502';
  end if;

  -- Lock the team first so simultaneous saves for different colleges serialize.
  select * into v_team from public.team_counts
  where team_id = new.team_id for update;
  if not found then
    raise exception 'Team counts are unavailable.' using errcode = '23503';
  end if;

  insert into public.college_counts (team_id, college_id)
  values (new.team_id, new.college_id)
  on conflict (team_id, college_id) do nothing;
  select * into v_college from public.college_counts
  where team_id = new.team_id and college_id = new.college_id for update;

  if new.previous_college_interested is distinct from v_college.interested
     or new.previous_college_registered_unpaid is distinct from v_college.registered_unpaid
     or new.previous_college_confirmed_paid is distinct from v_college.confirmed_paid then
    raise exception 'This college changed since you opened the update. Reopen it and try again.'
      using errcode = '40001';
  end if;

  v_interested_delta := new.college_interested - v_college.interested;
  v_registered_delta := new.college_registered_unpaid - v_college.registered_unpaid;
  v_confirmed_delta := new.college_confirmed_paid - v_college.confirmed_paid;
  new.note := btrim(coalesce(new.note, ''));
  if new.entry_kind = 'allocation' then
    if v_interested_delta < 0 or v_registered_delta < 0 or v_confirmed_delta < 0
       or (v_interested_delta = 0 and v_registered_delta = 0 and v_confirmed_delta = 0) then
      raise exception 'Assign a positive amount from earlier team totals.' using errcode = '23514';
    end if;
    select coalesce(sum(interested), 0), coalesce(sum(registered_unpaid), 0),
      coalesce(sum(confirmed_paid), 0)
      into v_recorded_interested, v_recorded_registered, v_recorded_confirmed
    from public.college_counts where team_id = new.team_id;
    if v_interested_delta > v_team.interested - v_recorded_interested
       or v_registered_delta > v_team.registered_unpaid - v_recorded_registered
       or v_confirmed_delta > v_team.confirmed_paid - v_recorded_confirmed then
      raise exception 'This exceeds the earlier team totals still awaiting a college.'
        using errcode = '23514';
    end if;
    v_team_interested_delta := 0;
    v_team_registered_delta := 0;
    v_team_confirmed_delta := 0;
  else
    if v_interested_delta = 0 and v_registered_delta = 0 and v_confirmed_delta = 0
       and new.note = '' then
      raise exception 'Change a college count or add a note before saving.' using errcode = '23514';
    end if;
    v_team_interested_delta := v_interested_delta;
    v_team_registered_delta := v_registered_delta;
    v_team_confirmed_delta := v_confirmed_delta;
  end if;

  new.previous_interested := v_team.interested;
  new.previous_registered_unpaid := v_team.registered_unpaid;
  new.previous_confirmed_paid := v_team.confirmed_paid;
  new.interested := v_team.interested + v_team_interested_delta;
  new.registered_unpaid := v_team.registered_unpaid + v_team_registered_delta;
  new.confirmed_paid := v_team.confirmed_paid + v_team_confirmed_delta;
  new.college_name := v_college_name;
  new.created_by := v_user;

  update public.college_counts set
    interested = new.college_interested,
    registered_unpaid = new.college_registered_unpaid,
    confirmed_paid = new.college_confirmed_paid
  where team_id = new.team_id and college_id = new.college_id;
  update public.team_counts set
    interested = new.interested,
    registered_unpaid = new.registered_unpaid,
    confirmed_paid = new.confirmed_paid
  where team_id = new.team_id;

  return new;
end;
$$;

-- Team totals and audit fields are written only by the checked trigger.
revoke insert (interested, registered_unpaid, confirmed_paid,
  previous_interested, previous_registered_unpaid, previous_confirmed_paid)
  on public.count_entries from authenticated;
grant insert (team_id, college_id, note, entry_kind,
  college_interested, college_registered_unpaid, college_confirmed_paid,
  previous_college_interested, previous_college_registered_unpaid, previous_college_confirmed_paid)
  on public.count_entries to authenticated;
grant select on public.count_entries to authenticated;
