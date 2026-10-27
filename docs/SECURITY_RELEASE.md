# Security release

Apply `supabase/migrations/20261023201115_secure_profile_authority.sql` to the intended Supabase project before enabling AI generation. It restricts profile authority, enforces suspension in RLS, checks PWS plan ownership and creates an atomic allowance of 10 AI generations per user per UTC day. The migration has local PostgreSQL (PGlite) regression tests; applying it to production is a separate deployment step.

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend. The Node API accepts those same server environment variables or `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. `HF_TOKEN` remains server-only. Do not use a service-role key in a VITE variable. Missing authentication or quota configuration fails closed.

All application routes require a verified Supabase user and active profile. Legacy browser passwords and forged cached sessions no longer grant access. Users must exist in Supabase Auth; profile creation defaults to AGENTE. Role changes, suspension and password administration must use trusted administrator tooling; the former local-only account controls are disabled.

New CRM, PWS, account and call data is stored in browser keys scoped to the verified user ID. The old shared keys are preserved but are not automatically imported because their owner cannot be inferred safely. Recover those records only after confirming the intended owner. Back them up before any manual migration. Logout preserves saved user data but clears the active storage identity. This isolates normal account switching; local browser storage is not encrypted and does not protect against someone controlling the same OS/browser profile.

Uploads accept at most 4 MiB; XLSX archives at most 24 MiB expanded, 1,000 members, 250,000 cells per sheet and 500,000 cells total. Limits also cover sparse and merged ranges. Multipart parsing no longer depends on removed Python `cgi` APIs. Scanner output still highlights blacklisted rows; it does not erase their values.

Validation: `npm test`, `python3 -m unittest discover -s tests -p 'test_*.py'`, `npm run build`, `npm audit`. Remote configuration, prior history, existing account roles, production log exposure and a real-user end-to-end login have not been verified by these local checks. Review existing privileged profiles for unauthorized historic changes before rollout.
