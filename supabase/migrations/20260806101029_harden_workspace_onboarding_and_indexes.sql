alter table public.workspaces
  add column created_by uuid not null default auth.uid() references auth.users(id);

create index workspaces_created_by_idx on public.workspaces(created_by);
create index people_linked_user_id_idx on public.people(linked_user_id);
create index checklist_template_items_workspace_template_idx
  on public.checklist_template_items(workspace_id, template_id);
create index checklist_runs_workspace_event_idx
  on public.checklist_runs(workspace_id, event_id);
create index checklist_runs_workspace_vehicle_idx
  on public.checklist_runs(workspace_id, vehicle_id);
create index checklist_runs_workspace_template_idx
  on public.checklist_runs(workspace_id, template_id);
create index checklist_item_results_workspace_run_idx
  on public.checklist_item_results(workspace_id, checklist_run_id);
create index checklist_item_results_workspace_template_item_idx
  on public.checklist_item_results(workspace_id, template_item_id);
create index checklist_item_results_completed_by_idx
  on public.checklist_item_results(completed_by);

create or replace function private.workspace_has_members(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.memberships as m
    where m.workspace_id = target_workspace_id
  );
$$;

revoke all on function private.workspace_has_members(uuid) from public;
grant execute on function private.workspace_has_members(uuid) to authenticated;

create or replace function private.prevent_workspace_creator_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_workspace_creator_change() from public;

create trigger workspaces_created_by_immutable
before update on public.workspaces
for each row execute function private.prevent_workspace_creator_change();

drop policy "owners insert memberships" on public.memberships;
create policy "owners or creator insert memberships"
on public.memberships for insert to authenticated
with check (
  (select private.is_workspace_owner(workspace_id))
  or (
    user_id = (select auth.uid())
    and role = 'owner'::public.membership_role
    and status = 'active'::public.membership_status
    and not (select private.workspace_has_members(workspace_id))
    and exists (
      select 1
      from public.workspaces as w
      where w.id = workspace_id
        and w.created_by = (select auth.uid())
    )
  )
);

create policy "authenticated users create workspaces"
on public.workspaces for insert to authenticated
with check (created_by = (select auth.uid()));

create or replace function public.create_workspace(workspace_name text, workspace_slug text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  caller_id uuid := (select auth.uid());
  new_workspace_id uuid;
  normalized_name text := btrim(workspace_name);
  normalized_slug text := lower(btrim(workspace_slug));
begin
  if caller_id is null then
    raise exception 'authentication required';
  end if;
  if normalized_name = '' then
    raise exception 'workspace name is required';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid workspace slug';
  end if;

  insert into public.workspaces (name, slug, created_by)
  values (normalized_name, normalized_slug, caller_id)
  returning id into new_workspace_id;

  insert into public.memberships (workspace_id, user_id, role, status)
  values (new_workspace_id, caller_id, 'owner', 'active');

  return new_workspace_id;
end;
$$;

revoke all on function public.create_workspace(text, text) from public;
revoke all on function public.create_workspace(text, text) from anon;
grant execute on function public.create_workspace(text, text) to authenticated;
