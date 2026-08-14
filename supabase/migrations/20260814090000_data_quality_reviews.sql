create table public.data_quality_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  issue_key text not null,
  entity_type text not null check (entity_type in ('event','session')),
  entity_id uuid not null,
  issue_type text not null,
  resolution text not null check (resolution in ('confirmed','intentionally_missing')),
  note text,
  resolved_by uuid not null default auth.uid() references auth.users(id),
  resolved_at timestamptz not null default now(),
  unique (workspace_id, issue_key),
  unique (workspace_id, id)
);

create index data_quality_reviews_workspace_resolution_idx
  on public.data_quality_reviews(workspace_id, resolution, resolved_at desc);
create index data_quality_reviews_resolved_by_idx
  on public.data_quality_reviews(resolved_by);

alter table public.data_quality_reviews enable row level security;
revoke all on public.data_quality_reviews from anon;
grant select, insert, update, delete on public.data_quality_reviews to authenticated;

create policy "workspace members read" on public.data_quality_reviews
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.data_quality_reviews
  for insert to authenticated
  with check ((select private.can_edit_workspace(workspace_id)) and resolved_by = (select auth.uid()));
create policy "workspace editors update" on public.data_quality_reviews
  for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)) and resolved_by = (select auth.uid()));
create policy "workspace editors delete" on public.data_quality_reviews
  for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create trigger data_quality_reviews_workspace_id_immutable
  before update on public.data_quality_reviews
  for each row execute function private.prevent_workspace_id_change();
