# Pulse Sales

Multi-tenant sales management SaaS: sales and line items with price autofill, customers, products,
effective-dated price history, dashboards, reports with exports, a per-role rights matrix, soft delete
with restore, audit log, billing, and a platform admin console for the SaaS owner.

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind v4 · PostgreSQL 16 + Drizzle ORM ·
Recharts · jsPDF / ExcelJS · Stripe (optional) · Vitest

## Quick start (local)

Requires Node 20+ and PostgreSQL 16 running on `localhost:5432`.

```bash
npm install
cp .env.example .env.local        # then set DATABASE_URL with your postgres password
createdb -U postgres pulse_sales   # or create it in pgAdmin
npm run db:setup                   # run migrations + load demo data
npm run dev                        # http://localhost:3000
```

### Demo accounts

All demo accounts use the password in `SEED_PASSWORD` (`.env.example` default: `pulse-demo-123`).

| Email | What you'll see |
|---|---|
| `admin@pulse.test` | Platform admin console at `/admin` |
| `owner@acme.test` | Acme owner, Business plan, full access |
| `admin@acme.test` | Acme admin (no billing) |
| `manager@acme.test` | Manager: sees every rep's sales, reports, exports |
| `rep@acme.test` | Rep: only own sales; also a member of BuildRight (org switcher) |
| `owner@buildright.test` | Second tenant on Pro, isolated data |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build / serve |
| `npm run typecheck` · `lint` · `test` | Quality gates |
| `npm run db:generate` | New migration from `src/db/schema.ts` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Wipe and reload demo data |

## How it's built

- **Tenancy:** every business table has `organization_id`. All reads go through helpers that scope by the
  active org (`getTenant()` in `src/lib/auth.ts`, `salesScope()` in `src/lib/queries.ts`); every server action
  re-checks rights with `requireRight()` and verifies that referenced rows belong to the same org.
- **Rights:** 12 granular rights (ported from HOPE's matrix) stored per org in `role_rights`, editable in
  *Team & rights*. Owners always have all rights.
- **Auth:** email + password (bcrypt), opaque session tokens stored hashed in `sessions`, httpOnly cookie,
  rate-limited login/signup/reset/invite.
- **Soft delete:** sales cascade to their line items; restore brings back exactly the items deleted with the sale.
- **Audit:** every write records before/after JSON in `audit_log` (tenant scope) and admin actions are logged
  with `scope = platform`.
- **Billing:** `src/lib/billing.ts`. Without Stripe keys it runs in *local mode* (plan switches apply instantly and
  record a paid invoice). With keys it uses Checkout, the Customer Portal and an idempotent webhook at
  `/api/stripe/webhook`.
- **Email:** written to the `email_outbox` table and the server console. View it in *Admin → Webhooks & emails*
  (invite and reset links are clickable there).

## Stripe (optional)

1. Create two recurring per-seat prices in Stripe test mode and put their ids in `STRIPE_PRICE_PRO` /
   `STRIPE_PRICE_BUSINESS`, plus `STRIPE_SECRET_KEY`.
2. Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the signing secret
   into `STRIPE_WEBHOOK_SECRET`.

## Deploying (Vercel + any Postgres)

Set the same env vars in Vercel (`APP_URL` = your domain), run `npm run db:migrate` against the production
database once, then create your first platform admin:

```sql
insert into platform_admins (user_id, role) select id, 'super' from users where email = 'you@example.com';
```

See `docs/DECISIONS.md` for the architecture choices.
