# Decisions

| # | Decision | Why |
|---|---|---|
| 1 | **Local PostgreSQL 16 + Drizzle** instead of Supabase | Requirement was "all local". Supabase local needs Docker, which isn't installed; Postgres 16 already is. Drizzle keeps SQL explicit and migrations in git. Moving to Supabase/Neon later is just a `DATABASE_URL` change. |
| 2 | **Own session auth** (bcrypt + hashed opaque tokens) instead of Supabase Auth / Auth.js | No external service needed, sessions revocable server-side (password change signs out other devices, disabling a user kills sessions), supports read-only impersonation via a session column. Google OAuth was dropped for v1 because it needs a public callback + Google credentials. |
| 3 | **App-layer tenant isolation** instead of Postgres RLS | Without Supabase there's no per-request JWT for RLS. Isolation is enforced by one code path (`getTenant`, `salesScope`, org checks in every action) and covered by integration tests in `tests/db.test.ts`. RLS can be layered on later with `set_config('app.org_id')`. |
| 4 | **Rights matrix kept from HOPE**, made per-org and extended (12 rights) | It's the strongest idea in the reference project; roles alone are too coarse for sales teams. |
| 5 | **Billing provider interface** with a local fallback | The full product (plan limits, invoices, admin MRR) works offline; Stripe switches on with env vars only. |
| 6 | **Email outbox table** instead of Resend | Local-first; invite/reset links visible in the admin console. Swap `sendMail()` for Resend when deploying. |
| 7 | **Soft-delete cascade in application code** (one transaction) instead of DB triggers | Easier to test and reason about; restore only revives items deleted *with* the sale (matched by timestamp). |
| 8 | **Forms are server actions + Zod**, pages are server components | No client data layer needed; every mutation is validated and authorized on the server. |
| 9 | **Sale numbers** are per-org sequences (`organizations.next_sale_no`) incremented atomically | Human-friendly `#1001` numbers without collisions across tenants. |
| 10 | **Plan limits stored in DB** (`plan_limits`), editable in `/admin/plans` | Pricing changes without a deploy. |
