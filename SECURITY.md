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

## Public registration protection

Public registration is fail-closed. It is available only when all of the following are configured:

- Supabase Auth allows new user signups.
- Supabase Auth CAPTCHA protection is enabled with Cloudflare Turnstile.
- `PUBLIC_SIGNUP_ENABLED=true` is set on the application server.
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` contains the matching public Turnstile site key.

Keep `PUBLIC_SIGNUP_ENABLED` unset or set to `false` during an email-abuse incident. Existing password sign-ins continue to work. The signup server action also validates input, requires the CAPTCHA token, and includes a honeypot field. Supabase Auth rate limits remain the outer rate-limit boundary.
