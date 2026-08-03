# Security

Report security concerns privately to the Ball Pit Motorsports repository owner. Do not open a public issue containing credentials, personal information, or exploitable details.

## Required controls

- Managed authentication; no application-owned password storage
- `workspace_id` on tenant-owned records
- PostgreSQL row-level security on exposed tables
- Server-only service-role credentials
- Short-lived signed file URLs and workspace-scoped object paths
- Tenant-isolation tests before production use
- MFA for GitHub, Supabase, and Vercel owners
