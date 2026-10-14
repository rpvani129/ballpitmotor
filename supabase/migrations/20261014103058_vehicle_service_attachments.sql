-- Keep files private and constrain a service attachment to its own vehicle.
alter table public.maintenance_records add constraint maintenance_records_attachment_parent_key unique (workspace_id, vehicle_id, id);
create table public.vehicle_attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id uuid not null,
  maintenance_record_id uuid,
  storage_path text not null,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 26214400),
  title text not null check (char_length(btrim(title)) between 1 and 160),
  category text not null default 'Other' check (category in ('Registration','Insurance','Title','Dyno Sheet','Setup Guide','Technical Document','Receipt','Photo','Other')),
  notes text check (char_length(notes) <= 2000),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, vehicle_id) references public.vehicles(workspace_id, id) on delete restrict,
  foreign key (workspace_id, vehicle_id, maintenance_record_id) references public.maintenance_records(workspace_id, vehicle_id, id) on delete restrict,
  unique (storage_path),
  check (storage_path like workspace_id::text || '/' || vehicle_id::text || '/' || coalesce(maintenance_record_id::text, 'vehicle') || '/%' and array_length(string_to_array(storage_path, '/'), 1) = 4)
);
create index vehicle_attachments_parent_idx on public.vehicle_attachments(workspace_id, vehicle_id, maintenance_record_id, created_at desc);
create index vehicle_attachments_uploaded_by_idx on public.vehicle_attachments(uploaded_by);
alter table public.vehicle_attachments enable row level security;
revoke all on public.vehicle_attachments from anon, authenticated;
grant select, insert, delete on public.vehicle_attachments to authenticated;
create policy "vehicle attachment members read" on public.vehicle_attachments for select to authenticated using ((select private.is_workspace_member(workspace_id)));
create policy "vehicle attachment editors insert" on public.vehicle_attachments for insert to authenticated with check ((select private.can_edit_workspace(workspace_id)) and uploaded_by = (select auth.uid()));
create policy "vehicle attachment editors delete" on public.vehicle_attachments for delete to authenticated using ((select private.can_edit_workspace(workspace_id)));
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('vehicle-attachments','vehicle-attachments',false,26214400,array['application/pdf','image/jpeg','image/png','image/webp','image/heic','text/csv','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
create policy "vehicle document members read" on storage.objects for select to authenticated using (
  bucket_id = 'vehicle-attachments' and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(name))[1] and v.id::text = (storage.foldername(name))[2] and private.is_workspace_member(v.workspace_id))
);
create policy "vehicle document editors insert" on storage.objects for insert to authenticated with check (
  bucket_id = 'vehicle-attachments' and array_length(string_to_array(name,'/'),1) = 4 and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(name))[1] and v.id::text = (storage.foldername(name))[2] and private.can_edit_workspace(v.workspace_id) and ((storage.foldername(name))[3] = 'vehicle' or exists (select 1 from public.maintenance_records r where r.workspace_id = v.workspace_id and r.vehicle_id = v.id and r.id::text = (storage.foldername(name))[3])))
);
create policy "vehicle document editors delete" on storage.objects for delete to authenticated using (
  bucket_id = 'vehicle-attachments' and exists (select 1 from public.vehicles v where v.workspace_id::text = (storage.foldername(name))[1] and v.id::text = (storage.foldername(name))[2] and private.can_edit_workspace(v.workspace_id))
);
