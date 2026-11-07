-- Each leader save keeps the chosen college, note, and before/after totals.
-- Existing team totals remain intact; history starts with the first new save.
create table public.count_entries (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  college_id uuid references public.colleges(id) on delete set null,
  college_name text not null,
  note text not null default '' check (char_length(note) <= 1000),
  interested integer not null check (interested >= 0),
  registered_unpaid integer not null check (registered_unpaid >= 0),
  confirmed_paid integer not null check (confirmed_paid >= 0),
  previous_interested integer not null check (previous_interested >= 0),
  previous_registered_unpaid integer not null check (previous_registered_unpaid >= 0),
  previous_confirmed_paid integer not null check (previous_confirmed_paid >= 0),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index count_entries_team_time_idx
  on public.count_entries (team_id, created_at desc);
create index count_entries_time_idx
  on public.count_entries (created_at desc);

alter table public.count_entries enable row level security;

create policy count_entries_read on public.count_entries for select to authenticated
using ((select private.is_admin()) or (select private.leads_team(team_id)));

create policy count_entries_leader_insert on public.count_entries for insert to authenticated
with check (
  (select private.leads_team(team_id))
  and exists (
    select 1 from public.colleges c
    where c.id = count_entries.college_id
      and c.team_id = count_entries.team_id
  )
);

revoke all on public.count_entries from public, anon, authenticated;
grant select on public.count_entries to authenticated;
grant insert (team_id, college_id, note, interested, registered_unpaid, confirmed_paid,
  previous_interested, previous_registered_unpaid, previous_confirmed_paid)
  on public.count_entries to authenticated;

-- All counter changes now go through a college-labelled entry in one transaction.
revoke update (interested, registered_unpaid, confirmed_paid)
  on public.team_counts from authenticated;

create function private.record_count_entry()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_college_name text;
  v_counts public.team_counts%rowtype;
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

  select * into v_counts from public.team_counts
  where team_id = new.team_id for update;
  if not found then
    raise exception 'Team counts are unavailable.' using errcode = '23503';
  end if;

  if new.previous_interested <> v_counts.interested
     or new.previous_registered_unpaid <> v_counts.registered_unpaid
     or new.previous_confirmed_paid <> v_counts.confirmed_paid then
    raise exception 'Counts changed since this update was opened. Reopen it and try again.'
      using errcode = '40001';
  end if;

  new.note := btrim(coalesce(new.note, ''));
  if new.interested = v_counts.interested
     and new.registered_unpaid = v_counts.registered_unpaid
     and new.confirmed_paid = v_counts.confirmed_paid
     and new.note = '' then
    raise exception 'Change a count or add a note before saving.' using errcode = '23514';
  end if;

  new.college_name := v_college_name;
  new.created_by := v_user;

  update public.team_counts set
    interested = new.interested,
    registered_unpaid = new.registered_unpaid,
    confirmed_paid = new.confirmed_paid
  where team_id = new.team_id;

  return new;
end;
$$;

revoke all on function private.record_count_entry() from public, anon, authenticated;
create trigger count_entries_record before insert on public.count_entries
for each row execute function private.record_count_entry();
