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

When a Turnstile site key is configured, the password login form also supplies a CAPTCHA token. Deploy this support and configure the matching site key before enabling Supabase CAPTCHA, then verify an existing user's login. Only `registerNewUser` may create public accounts; do not add an alternate signup action without the same checks.

## Registration incident handoff

1. Keep application registration paused and turn off **Allow new users to sign up** in Supabase Authentication > Sign In / Providers. Keep the Email provider enabled so existing users retain password login. Verify the backend setting; a hidden signup form alone does not stop direct Auth API requests.
2. Review unconfirmed accounts with no prior sign-in, sessions, memberships, profiles, owned workspaces, records, or storage objects. Lack of confirmation alone does not prove bot activity. Delete only positively identified bot accounts after checking references and preserving a recoverable checkpoint. As of the 2026-10-14 read-only audit, all four current accounts were confirmed; there were no unconfirmed accounts to remove and no orphan memberships.
3. Configure a Cloudflare Turnstile widget for the production domain. Put its public site key in `NEXT_PUBLIC_TURNSTILE_SITE_KEY` in Vercel and its secret only in Supabase Authentication > Attack Protection. Keep `PUBLIC_SIGNUP_ENABLED=false` until testing is complete. Do not commit secrets.
4. Verify paused registration, existing login and profile completion, missing/invalid CAPTCHA rejection, honeypot rejection, invalid input rejection, valid signup and confirmation callback, tenant isolation, and duplicate signup behavior. Use a real address controlled by the tester, never invented recipients. Test in an isolated environment before reopening production. Include CAPTCHA in any future password-reset flow.
5. Reopen only after the backend CAPTCHA, email delivery, and existing login are verified. Enable backend signup and the application flag together. Monitor signup volume and bounces; turn both signup controls off if abuse recurs.

## Custom SMTP and email handoff

Choose an SMTP provider and verify a dedicated transactional sending subdomain such as `auth.ballpitmotor.com`. Set up the provider's SPF and DKIM records and a suitable DMARC policy before sending. Keep authentication mail separate from marketing mail.

Proposed sender name: **The Grid by Ball Pit Motorsports**. Proposed sender address: `no-reply@auth.ballpitmotor.com` (use only after domain verification). Configure the SMTP host, port, username and password directly in Supabase; credentials must not be stored in this repository or pasted into chat. Keep email confirmation enabled. Disable email link tracking if it alters authentication links.

Suggested confirmation subject: **Confirm your The Grid account**. Suggested template:

```html
<h2>The Grid by Ball Pit Motorsports</h2>
<p>Confirm your email address to finish creating your account.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
<p>If you did not request this account, you can ignore this email.</p>
```

Suggested password reset subject: **Reset your The Grid password**. Suggested template:

```html
<h2>The Grid by Ball Pit Motorsports</h2>
<p>Use the link below to reset your password.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you did not request this change, you can ignore this email.</p>
```

Verify production Site URL and allowed callback URLs, delivery to controlled Gmail and Outlook addresses, confirmation and recovery links, expiry behavior, and provider bounce reporting. SMTP configuration and templates remain a handoff until dashboard and provider access are available.

References: [Supabase CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha), [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp), and [email templates](https://supabase.com/docs/guides/auth/auth-email-templates).
