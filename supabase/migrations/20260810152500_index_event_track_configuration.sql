create index events_track_configuration_idx
  on public.events(workspace_id, track_id, configuration_id);
