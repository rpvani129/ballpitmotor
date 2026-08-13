create table public.event_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id uuid not null,
  category text not null default 'General'
    check (category in ('General', 'Plan', 'Setup', 'Driver Feedback', 'Incident', 'Follow-up')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, event_id)
    references public.events(workspace_id, id) on delete cascade,
  unique (workspace_id, id)
);

create index event_notes_event_timeline_idx
  on public.event_notes(workspace_id, event_id, created_at desc);

alter table public.event_notes enable row level security;
revoke all on public.event_notes from anon;
grant select, insert, update, delete on public.event_notes to authenticated;

create policy "workspace members read" on public.event_notes
  for select to authenticated
  using ((select private.is_workspace_member(workspace_id)));
create policy "workspace editors insert" on public.event_notes
  for insert to authenticated
  with check (
    (select private.can_edit_workspace(workspace_id))
    and created_by = (select auth.uid())
  );
create policy "workspace editors update" on public.event_notes
  for update to authenticated
  using ((select private.can_edit_workspace(workspace_id)))
  with check ((select private.can_edit_workspace(workspace_id)));
create policy "workspace editors delete" on public.event_notes
  for delete to authenticated
  using ((select private.can_edit_workspace(workspace_id)));

create trigger event_notes_workspace_id_immutable
  before update on public.event_notes
  for each row execute function private.prevent_workspace_id_change();

insert into public.event_notes (workspace_id, event_id, category, body, created_by, created_at, updated_at)
select workspace_id, id, 'General', notes, created_by, created_at, created_at
from public.events
where nullif(trim(notes), '') is not null;
