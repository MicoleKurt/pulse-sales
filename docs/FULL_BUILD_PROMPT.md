# ROLE
You are a principal full-stack engineer. Build the **complete, working Pulse Sales
SaaS in one continuous run**. Do not stop between phases and don't ask for review
mid-way. Only stop when you hit a hard blocker that needs me: a missing secret, a
paid action, or a decision only I can make. Ship it the way a senior team would
ship v1.0.

# CURRENT STATE (don't redo it)
Repo: https://github.com/MicoleKurt/pulse-sales (private, branch `main`)
Already done: Next.js 15 App Router + TypeScript strict + Tailwind v4, design
tokens in `src/app/globals.css` (indigo/teal, light + dark), `next-themes`
toggle, `AppShell` (gradient sidebar + header) in `src/components/app-shell.tsx`,
nav config in `src/lib/nav.ts`, placeholder `[...section]` page.
Inspiration (read-only): `../_reference/hope`. Port its sales flow, rights
matrix, soft-delete cascade and audit log into a multi-tenant design. Use no HOPE
branding.

# STACK (install what's missing)
Supabase (Postgres, Auth, RLS, Storage) via `@supabase/ssr` · Drizzle ORM +
drizzle-kit migrations · Zod · React Hook Form · TanStack Query + Table ·
Recharts · shadcn/ui primitives (keep them on our tokens) · Stripe · Resend ·
jsPDF/xlsx (or exceljs) for exports · Vitest + Playwright · Vercel

# DATA MODEL (all tenant tables have `organization_id`, `created_at`,
# `updated_at`, `created_by`, `deleted_at`)
- organizations (name, slug, logo_url, currency, tax_rate, plan, trial_ends_at, status)
- profiles (user_id → auth.users, full_name, avatar_url)
- organization_members (org, user, role: owner|admin|manager|rep, status: invited|active|inactive)
- role_rights (org, role, right_code, allowed). The rights are SALES_VIEW/ADD/EDIT/DEL,
  ITEM_VIEW/ADD/EDIT/DEL, LOOKUP_VIEW, LOOKUP_EDIT, REPORT_VIEW, EXPORT, TEAM_ADMIN,
  BILLING_ADMIN, AUDIT_VIEW. Seed sensible defaults per role on org creation.
- invitations (org, email, role, token, expires_at, accepted_at)
- customers, products (sku, name, unit), price_history (product, unit_price, effective_date)
- sales (number per org, customer, rep member, sale_date, status, subtotal, tax, total, notes)
- sale_items (sale, product, qty, unit_price autofilled from the latest price ≤ sale_date, line_total)
- audit_log (org, actor, table, record_id, action, before, after jsonb). Postgres trigger on every tenant table.
- subscriptions (org, stripe_customer_id, stripe_subscription_id, plan, status, seats, current_period_end)
- platform_admins (user_id, role: super|support)
- announcements (scope: all|org, org_id?, message, starts_at, ends_at)
- webhook_events (provider, event_id unique, type, payload, processed_at)

DB rules:
- RLS on every table: a user sees rows only for orgs where they're an active member.
  Reps see only their own sales unless they have SALES_VIEW_ALL (managers+).
- Helper SQL functions: `is_member(org)`, `has_right(org, code)`.
- Soft delete cascades sale → sale_items, and restore cascades too.
- Totals are recomputed by trigger when items change.
- SQL views for the dashboard and reports (revenue by day, by rep, by product, by customer).

# FEATURES (all of them, fully working)
**Public:** landing page (hero, features, pricing, FAQ, footer), /pricing,
/login, /signup, /forgot-password, /reset-password, /auth/callback, /invite/[token].
Auth uses email+password, magic link and Google.

**Onboarding:** after signup, create an org (name, currency, tax), become its owner,
and start a 14-day Pro trial. Users can switch orgs if they belong to several.

**Tenant app** (replace every placeholder page):
- Dashboard: 4 KPI cards (revenue, sales count, avg order, top product) with
  sparkline and % change vs the previous period, revenue trend chart, top reps,
  top customers, recent sales, date-range picker (7d/30d/90d/YTD/custom)
- Sales: table with search, filters (date, rep, customer, status), sort,
  pagination; create/edit drawer; detail page with line items (add/edit/remove,
  price autofill); print/PDF invoice
- Customers / Products / Price history: CRUD + CSV import (with validation
  preview) and export; customer detail with purchase history
- Team: member list, per-rep performance
- Team & rights: invite by email (Resend), change role, deactivate, editable
  rights matrix per role (owner is always full)
- Reports: by period, product, rep and customer, with charts + tables, export PDF/XLSX/CSV
- Deleted items: restore or permanently purge (owner/admin only)
- Audit log: filterable timeline with a before/after diff
- Settings: org profile + logo upload (Storage), currency, tax, danger zone
  (delete org); Billing tab (current plan, seats, usage, Stripe portal)
- Profile: name, avatar, password, theme
- Global search (Ctrl+K) across sales, customers and products. Notifications
  bell (invites, sale assigned, payment failed) backed by a notifications table.

**Platform admin console** (`/admin`, platform_admins only, server-side checks):
- Overview: MRR, ARR, active orgs, signups, trial→paid conversion, churn, ARPU, charts
- Organizations: search/list, detail (members, usage, subscription), suspend/
  reactivate, extend trial, read-only impersonation ("view as", audit-logged)
- Users: global search, disable/enable, memberships
- Billing: subscriptions, failed payments, invoices
- Plans & limits editor, announcements (all orgs or one), platform audit log,
  webhook events log

**Billing:** Stripe Checkout + Customer Portal. Plans:
Free (1 seat, 100 sales/mo, no exports), Pro $19/seat/mo, Business $39/seat/mo
(audit log, advanced reports, priority support). Webhooks (idempotent via
webhook_events) sync `subscriptions`. Limits are enforced in server actions with
a friendly upgrade prompt.

# QUALITY BAR
- Server Actions / route handlers validate with Zod and check `has_right` on the server.
- Service-role key only in server code. Rate-limit auth + invite endpoints.
- Every page has loading skeletons, empty states, error boundaries and toast feedback.
- Responsive down to 360px, keyboard accessible, WCAG AA in both themes.
- No hardcoded colors; use the tokens only.
- `npm run build`, `npm run lint`, `npm run typecheck` and `npm test` all pass.
- Tests: RLS tenant isolation, rights enforcement, price autofill + totals,
  Stripe webhook handling, and Playwright e2e (signup → create org → add product →
  create sale → see it on the dashboard).
- Seed script: 1 platform admin, 2 orgs, 6 users across roles, 50 customers,
  30 products with price history, 300 sales over 12 months.

# DELIVERABLES
- `supabase/migrations/*` (or drizzle migrations), `scripts/seed.ts`
- `.env.example` listing every variable, and a README (setup, local Supabase,
  Stripe CLI webhooks, seeding, deploy to Vercel, creating the first platform admin)
- Atomic commits pushed to `main` as you go, with clear messages
- A final report: what's built, how to run it, test results, and known limitations

# WORKING STYLE
Work autonomously from start to finish. Pick sensible defaults and record
them in `docs/DECISIONS.md`. Verify each feature in the browser before moving on.
Never fake a feature: if a button exists, it works.
