-- Personal Discover bookmarks. No tracker events, sessions or registrations.
create table public.event_interests (
  workspace_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  drive_ntx_event_id text not null check (drive_ntx_event_id ~ '^[a-zA-Z0-9_-]{1,180}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, workspace_id, drive_ntx_event_id),
  foreign key (workspace_id, user_id) references public.memberships(workspace_id, user_id) on delete cascade
);
create index event_interests_workspace_member_idx on public.event_interests(workspace_id, user_id);
alter table public.event_interests enable row level security;

create policy "users read own interests" on public.event_interests
for select to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.memberships m where m.workspace_id = event_interests.workspace_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);
create policy "users save own interests" on public.event_interests
for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (
    select 1 from public.memberships m where m.workspace_id = event_interests.workspace_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);
create policy "users remove own interests" on public.event_interests
for delete to authenticated using (
  user_id = (select auth.uid()) and exists (
    select 1 from public.memberships m where m.workspace_id = event_interests.workspace_id
    and m.user_id = (select auth.uid()) and m.status = 'active'
  )
);
revoke all on public.event_interests from anon, authenticated;
grant select, insert, delete on public.event_interests to authenticated;
