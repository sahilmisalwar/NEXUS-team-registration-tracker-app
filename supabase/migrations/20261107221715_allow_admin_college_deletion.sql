-- Keep every saved entry linked to its college. An assigned college without
-- entries can be removed; one with history or tracked totals cannot.
alter table public.count_entries
  drop constraint count_entries_college_id_fkey,
  add constraint count_entries_college_id_fkey
    foreign key (college_id) references public.colleges(id) on delete restrict;

create policy colleges_delete on public.colleges
  for delete to authenticated
  using ((select private.is_admin()));

grant delete on public.colleges to authenticated;
