create table public.checklist_item_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null,
  checklist_run_id uuid not null references public.checklist_runs(id) on delete cascade,
  checklist_item_key text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 26214400),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, event_id) references public.events(workspace_id, id) on delete cascade,
  unique (workspace_id, storage_path)
);

create index checklist_item_attachments_item_idx
  on public.checklist_item_attachments(workspace_id, checklist_run_id, checklist_item_key, created_at);
create index checklist_item_attachments_event_idx
  on public.checklist_item_attachments(event_id);
create index checklist_item_attachments_uploaded_by_idx
  on public.checklist_item_attachments(uploaded_by);

alter table public.checklist_item_attachments enable row level security;
revoke all on public.checklist_item_attachments from anon;
grant select, insert, update, delete on public.checklist_item_attachments to authenticated;

create policy "workspace members read" on public.checklist_item_attachments for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.checklist_item_attachments for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and uploaded_by = (select auth.uid()));
create policy "workspace editors update" on public.checklist_item_attachments for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.checklist_item_attachments for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create trigger checklist_item_attachments_workspace_id_immutable before update on public.checklist_item_attachments
  for each row execute function private.prevent_workspace_id_change();
