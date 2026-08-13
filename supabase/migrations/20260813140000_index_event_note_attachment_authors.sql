create index event_notes_created_by_idx
  on public.event_notes(created_by);

create index event_attachments_uploaded_by_idx
  on public.event_attachments(uploaded_by);
