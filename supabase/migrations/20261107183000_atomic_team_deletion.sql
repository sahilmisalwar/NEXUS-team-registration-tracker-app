-- Delete a team and its leader account together. Team deletion removes entries
-- before the auth user is deleted, satisfying count_entries_created_by_fkey.
-- A failure anywhere rolls the whole operation back.
create or replace function public.admin_delete_team(p_team_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_leader_id uuid;
begin
  select leader_user_id into v_leader_id
  from public.teams
  where id = p_team_id
  for update;

  if not found then
    return false;
  end if;

  if v_leader_id is not null and not exists (
    select 1 from public.profiles
    where user_id = v_leader_id and role = 'leader'
  ) then
    raise exception 'Team leader account needs review before deletion';
  end if;

  delete from public.teams where id = p_team_id;

  if v_leader_id is not null then
    delete from auth.users where id = v_leader_id;
    if not found then
      raise exception 'Team leader account was not removed';
    end if;
  end if;

  return true;
end;
$$;

revoke all on function public.admin_delete_team(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_team(uuid) to service_role;
