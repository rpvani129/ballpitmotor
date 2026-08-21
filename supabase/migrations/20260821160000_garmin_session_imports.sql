alter table public.sessions
  add column if not exists source_storage_path text,
  add column if not exists source_file_name text;

create table public.session_imports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null,
  files jsonb not null default '[]'::jsonb check (jsonb_typeof(files) = 'array'),
  file_set_sha256 text not null,
  status text not null default 'processing' check (status in ('processing','review','failed','committed')),
  extracted_data jsonb,
  extraction_error text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, event_id) references public.events(workspace_id, id) on delete cascade
);

create table public.session_import_results (
  import_id uuid not null references public.session_imports(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  session_position integer not null check (session_position >= 0),
  primary key (import_id, session_id),
  unique (import_id, session_position)
);

create index session_imports_event_idx on public.session_imports(workspace_id, event_id, created_at desc);
create index session_imports_hash_idx on public.session_imports(workspace_id, event_id, file_set_sha256);
create index session_import_results_session_idx on public.session_import_results(session_id);

alter table public.session_imports enable row level security;
alter table public.session_import_results enable row level security;
revoke all on public.session_imports, public.session_import_results from anon;
grant select, insert, update, delete on public.session_imports to authenticated;
grant select, insert, delete on public.session_import_results to authenticated;

create policy "workspace members read" on public.session_imports for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.session_imports for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and created_by = (select auth.uid()));
create policy "workspace editors update" on public.session_imports for update to authenticated
  using ((select private.can_edit_workspace(workspace_id))) with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.session_imports for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));
create policy "workspace members read" on public.session_import_results for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.session_import_results for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.session_import_results for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create trigger session_imports_workspace_id_immutable before update on public.session_imports
  for each row execute function private.prevent_workspace_id_change();

create or replace function public.commit_session_import(p_import_id uuid, p_event_id uuid, p_sessions jsonb)
returns uuid[]
language plpgsql
set search_path = ''
as $$
declare
  v_import public.session_imports%rowtype;
  v_session jsonb;
  v_session_id uuid;
  v_session_ids uuid[] := '{}';
  v_position integer;
begin
  select * into v_import from public.session_imports
  where id = p_import_id and event_id = p_event_id and status = 'review'
  for update;
  if not found then raise exception 'Import is not available for review'; end if;
  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) < 1 or jsonb_array_length(p_sessions) > 50 then
    raise exception 'Import must contain between 1 and 50 sessions';
  end if;

  for v_session, v_position in
    select value, (ordinality - 1)::integer from jsonb_array_elements(p_sessions) with ordinality
  loop
    insert into public.sessions (
      workspace_id, event_id, session_number, started_at, best_lap_ms, source_storage_path,
      source_file_name, notes, created_by
    ) values (
      v_import.workspace_id, v_import.event_id, (v_session->>'session_number')::integer,
      nullif(v_session->>'started_at','')::time, nullif(v_session->>'best_lap_ms','')::integer,
      nullif(v_session->>'source_storage_path',''), nullif(v_session->>'source_file_name',''),
      nullif(v_session->>'notes',''), v_import.created_by
    ) returning id into v_session_id;
    insert into public.session_import_results(import_id, session_id, workspace_id, session_position)
    values (v_import.id, v_session_id, v_import.workspace_id, v_position);
    v_session_ids := array_append(v_session_ids, v_session_id);
  end loop;

  update public.session_imports set status = 'committed', extracted_data = jsonb_build_object('sessions', p_sessions), updated_at = now()
  where id = v_import.id;
  return v_session_ids;
end;
$$;
revoke all on function public.commit_session_import(uuid, uuid, jsonb) from public, anon;
grant execute on function public.commit_session_import(uuid, uuid, jsonb) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('garmin-session-imports', 'garmin-session-imports', false, 20971520,
  array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "garmin import members read" on storage.objects for select to authenticated
using (bucket_id = 'garmin-session-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "garmin import editors insert" on storage.objects for insert to authenticated
with check (bucket_id = 'garmin-session-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
create policy "garmin import editors delete" on storage.objects for delete to authenticated
using (bucket_id = 'garmin-session-imports' and exists (
  select 1 from public.memberships m where m.user_id = (select auth.uid()) and m.status = 'active'
    and m.role in ('owner','admin','editor','contributor') and m.workspace_id::text = (storage.foldername(name))[1]
));
