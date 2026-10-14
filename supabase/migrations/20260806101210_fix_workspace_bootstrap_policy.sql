create or replace function private.is_workspace_creator(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspaces as w
    where w.id = target_workspace_id
      and w.created_by = (select auth.uid())
  );
$$;

revoke all on function private.is_workspace_creator(uuid) from public;
grant execute on function private.is_workspace_creator(uuid) to authenticated;

drop policy "owners or creator insert memberships" on public.memberships;
create policy "owners or creator insert memberships"
on public.memberships for insert to authenticated
with check (
  (select private.is_workspace_owner(workspace_id))
  or (
    user_id = (select auth.uid())
    and role = 'owner'::public.membership_role
    and status = 'active'::public.membership_status
    and not (select private.workspace_has_members(workspace_id))
    and (select private.is_workspace_creator(workspace_id))
  )
);
