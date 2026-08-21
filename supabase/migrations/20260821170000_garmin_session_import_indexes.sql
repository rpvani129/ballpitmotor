create index session_imports_created_by_idx
  on public.session_imports(created_by);

create index session_import_results_workspace_idx
  on public.session_import_results(workspace_id);
