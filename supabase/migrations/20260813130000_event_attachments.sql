create table public.event_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 26214400),
  attachment_type text not null default 'Other'
    check (attachment_type in ('Garmin Screenshot', 'Photo', 'Setup Sheet', 'Receipt', 'Document', 'Other')),
  caption text check (caption is null or char_length(caption) <= 500),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, event_id)
    references public.events(workspace_id, id) on delete cascade,
  unique (workspace_id, storage_path),
  unique (workspace_id, id)
);

create index event_attachments_event_idx
  on public.event_attachments(workspace_id, event_id, created_at desc);

alter table public.event_attachments enable row level security;
revoke all on public.event_attachments from anon;
grant select, insert, update, delete on public.event_attachments to authenticated;

create policy "workspace members read" on public.event_attachments for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.event_attachments for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and uploaded_by = (select auth.uid()));
create policy "workspace editors update" on public.event_attachments for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.event_attachments for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create trigger event_attachments_workspace_id_immutable before update on public.event_attachments
  for each row execute function private.prevent_workspace_id_change();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-attachments', 'event-attachments', false, 26214400,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf','text/csv'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "event attachment members read" on storage.objects for select to authenticated
using (bucket_id = 'event-attachments' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "event attachment editors insert" on storage.objects for insert to authenticated
with check (bucket_id = 'event-attachments' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "event attachment editors delete" on storage.objects for delete to authenticated
using (bucket_id = 'event-attachments' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
