create table public.service_record_import_results (
  import_id uuid not null references public.service_record_imports(id) on delete cascade,
  maintenance_record_id uuid not null references public.maintenance_records(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  record_position integer not null check (record_position >= 0),
  created_at timestamptz not null default now(),
  primary key (import_id, maintenance_record_id),
  unique (import_id, record_position)
);

create index service_record_import_results_workspace_idx
  on public.service_record_import_results(workspace_id, created_at desc);
create index service_record_import_results_record_idx
  on public.service_record_import_results(maintenance_record_id);

alter table public.service_record_import_results enable row level security;
revoke all on public.service_record_import_results from anon;
grant select, insert, delete on public.service_record_import_results to authenticated;
create policy "workspace members read" on public.service_record_import_results for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.service_record_import_results for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.service_record_import_results for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

insert into public.service_record_import_results (import_id, maintenance_record_id, workspace_id, record_position)
select id, committed_record_id, workspace_id, 0
from public.service_record_imports
where committed_record_id is not null
on conflict do nothing;

create or replace function public.commit_service_record_import_batch(p_import_id uuid, p_vehicle_id uuid, p_records jsonb)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  v_import public.service_record_imports%rowtype;
  v_record jsonb;
  v_record_id uuid;
  v_record_ids uuid[] := '{}';
  v_record_position integer;
begin
  select * into v_import from public.service_record_imports
  where id = p_import_id and vehicle_id = p_vehicle_id and status = 'review'
  for update;
  if not found then raise exception 'Import is not available for review'; end if;
  if jsonb_typeof(p_records) <> 'array' or jsonb_array_length(p_records) < 1 or jsonb_array_length(p_records) > 20 then
    raise exception 'Import must contain between 1 and 20 service records';
  end if;

  for v_record, v_record_position in
    select value, (ordinality - 1)::integer
    from jsonb_array_elements(p_records) with ordinality
  loop
    if nullif(v_record->>'title', '') is null or nullif(v_record->>'service_date', '') is null then
      raise exception 'Each service record requires a title and service date';
    end if;

    insert into public.maintenance_records (
      workspace_id, vehicle_id, service_date, category, title, description, odometer_miles,
      vendor, cost, source_reference, source_storage_path, source_file_name, source_mime_type
    ) values (
      v_import.workspace_id, v_import.vehicle_id, (v_record->>'service_date')::date,
      coalesce(nullif(v_record->>'category',''), 'Maintenance'), v_record->>'title', nullif(v_record->>'description',''),
      nullif(v_record->>'odometer_miles','')::integer, nullif(v_record->>'vendor',''),
      nullif(v_record->>'cost','')::numeric, nullif(v_record->>'invoice_number',''),
      v_import.storage_path, v_import.file_name, v_import.mime_type
    ) returning id into v_record_id;

    insert into public.maintenance_record_items (
      workspace_id, maintenance_record_id, position, category, title, details, quantity,
      line_amount, source_item_number, status
    )
    select v_import.workspace_id, v_record_id, coalesce((item->>'position')::integer, (ordinality - 1)::integer),
      coalesce(nullif(item->>'category',''), 'Maintenance'), item->>'title', nullif(item->>'details',''),
      nullif(item->>'quantity',''), nullif(item->>'line_amount','')::numeric,
      nullif(item->>'source_item_number',''), coalesce(nullif(item->>'status',''), 'Complete')
    from jsonb_array_elements(coalesce(v_record->'items', '[]'::jsonb)) with ordinality as x(item, ordinality)
    where nullif(item->>'title','') is not null;

    insert into public.service_record_import_results (import_id, maintenance_record_id, workspace_id, record_position)
    values (v_import.id, v_record_id, v_import.workspace_id, v_record_position);
    v_record_ids := array_append(v_record_ids, v_record_id);
  end loop;

  update public.service_record_imports set
    status = 'committed',
    committed_record_id = v_record_ids[1],
    extracted_data = jsonb_build_object('records', p_records, 'warnings', coalesce(extracted_data->'warnings', '[]'::jsonb)),
    updated_at = now()
  where id = v_import.id;
  return v_record_ids;
end;
$$;

revoke all on function public.commit_service_record_import_batch(uuid, uuid, jsonb) from public, anon;
grant execute on function public.commit_service_record_import_batch(uuid, uuid, jsonb) to authenticated;
