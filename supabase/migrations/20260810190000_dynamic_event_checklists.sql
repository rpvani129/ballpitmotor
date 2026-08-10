-- A workspace has one standard checklist for future events. Historical versions
-- remain available to the event runs that reference them.
create unique index if not exists checklist_templates_one_active_per_workspace_idx
  on public.checklist_templates(workspace_id)
  where is_active;

-- Editors can replace the saved result rows while editing an event checklist.
drop policy if exists "workspace admins delete" on public.checklist_item_results;
create policy "workspace editors delete" on public.checklist_item_results
  for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

grant select, insert, update, delete on
  public.checklist_templates,
  public.checklist_template_items,
  public.checklist_runs,
  public.checklist_item_results
to authenticated;
