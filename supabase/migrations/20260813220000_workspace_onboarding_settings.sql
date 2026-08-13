alter table public.event_settings
  add column if not exists show_first_time_popup boolean not null default true;
