drop policy "members read workspaces" on public.workspaces;

create policy "members or creator read workspaces"
on public.workspaces for select to authenticated
using (
  (select private.is_workspace_member(id))
  or created_by = (select auth.uid())
);
