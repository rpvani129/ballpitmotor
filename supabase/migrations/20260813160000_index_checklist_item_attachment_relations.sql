create index checklist_item_attachments_run_id_idx
  on public.checklist_item_attachments(checklist_run_id);

create index checklist_item_attachments_workspace_event_idx
  on public.checklist_item_attachments(workspace_id, event_id);
