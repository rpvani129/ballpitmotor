grant delete on public.vehicles, public.events to authenticated;

drop policy if exists "workspace admins delete" on public.vehicles;
create policy "workspace admins delete" on public.vehicles
  for delete to authenticated
  using ((select private.can_admin_workspace(workspace_id)));

drop policy if exists "workspace admins delete" on public.events;
create policy "workspace admins delete" on public.events
  for delete to authenticated
  using ((select private.can_admin_workspace(workspace_id)));
