alter table public.maintenance_records
  add column if not exists source_storage_path text,
  add column if not exists source_file_name text,
  add column if not exists source_mime_type text,
  add column if not exists source_reference text;

create table public.service_record_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vehicle_id uuid not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes between 1 and 20971520),
  file_sha256 text not null,
  status text not null default 'processing' check (status in ('processing','review','failed','committed')),
  extracted_data jsonb,
  extraction_error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  committed_record_id uuid references public.maintenance_records(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, vehicle_id) references public.vehicles(workspace_id, id) on delete cascade,
  unique (workspace_id, storage_path)
);

create index service_record_imports_vehicle_idx on public.service_record_imports(workspace_id, vehicle_id, created_at desc);
create index service_record_imports_hash_idx on public.service_record_imports(workspace_id, file_sha256);
create index service_record_imports_creator_idx on public.service_record_imports(created_by);
create index service_record_imports_committed_record_idx on public.service_record_imports(committed_record_id) where committed_record_id is not null;

alter table public.service_record_imports enable row level security;
revoke all on public.service_record_imports from anon;
grant select, insert, update, delete on public.service_record_imports to authenticated;
create policy "workspace members read" on public.service_record_imports for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.service_record_imports for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and created_by = (select auth.uid()));
create policy "workspace editors update" on public.service_record_imports for update to authenticated
  using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.service_record_imports for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));
create trigger service_record_imports_workspace_id_immutable before update on public.service_record_imports
  for each row execute function private.prevent_workspace_id_change();

create or replace function public.commit_service_record_import(p_import_id uuid, p_vehicle_id uuid, p_record jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_import public.service_record_imports%rowtype;
  v_record_id uuid;
begin
  select * into v_import from public.service_record_imports
  where id = p_import_id and vehicle_id = p_vehicle_id and status = 'review'
  for update;
  if not found then raise exception 'Import is not available for review'; end if;

  insert into public.maintenance_records (
    workspace_id, vehicle_id, service_date, category, title, description, odometer_miles,
    vendor, cost, source_reference, source_storage_path, source_file_name, source_mime_type
  ) values (
    v_import.workspace_id, v_import.vehicle_id, (p_record->>'service_date')::date,
    coalesce(nullif(p_record->>'category',''), 'Maintenance'), p_record->>'title', nullif(p_record->>'description',''),
    nullif(p_record->>'odometer_miles','')::integer, nullif(p_record->>'vendor',''),
    nullif(p_record->>'cost','')::numeric, nullif(p_record->>'invoice_number',''),
    v_import.storage_path, v_import.file_name, v_import.mime_type
  ) returning id into v_record_id;

  insert into public.maintenance_record_items (
    workspace_id, maintenance_record_id, position, category, title, details, quantity,
    line_amount, source_item_number, status
  )
  select v_import.workspace_id, v_record_id, (ordinality - 1)::integer,
    coalesce(nullif(item->>'category',''), 'Maintenance'), item->>'title', nullif(item->>'details',''),
    nullif(item->>'quantity',''), nullif(item->>'line_amount','')::numeric,
    nullif(item->>'source_item_number',''), coalesce(nullif(item->>'status',''), 'Complete')
  from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) with ordinality as x(item, ordinality)
  where nullif(item->>'title','') is not null;

  update public.service_record_imports set status = 'committed', committed_record_id = v_record_id,
    extracted_data = p_record || jsonb_build_object('items', coalesce(p_items, '[]'::jsonb)), updated_at = now()
  where id = v_import.id;
  return v_record_id;
end;
$$;
revoke all on function public.commit_service_record_import(uuid, uuid, jsonb, jsonb) from public, anon;
grant execute on function public.commit_service_record_import(uuid, uuid, jsonb, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-record-imports', 'service-record-imports', false, 20971520,
  array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "service import members read" on storage.objects for select to authenticated
using (bucket_id = 'service-record-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "service import editors insert" on storage.objects for insert to authenticated
with check (bucket_id = 'service-record-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "service import editors delete" on storage.objects for delete to authenticated
using (bucket_id = 'service-record-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
