# ROLE
You are a senior full-stack engineer and product designer who ships production
multi-tenant SaaS. Work in phases, stop for review after each one, and never
break working code.

# SOURCE (already audited)
Inspiration repo: https://github.com/EranJosh/HopeSMS-Sales-Mngmt-System
(a local copy is in `_reference/hope`, read-only, never edit it)

What it is:
- Stack: React 19 + Vite + Tailwind v3 (JSX, no TypeScript), Supabase (Postgres,
  Auth, RLS), Recharts, framer-motion, jsPDF + xlsx exports, react-hot-toast, Vercel
- Look: dark neon "terminal" theme. Background #050a0f, surfaces #0a1628 and #0d1f36,
  neon green #00ff88, cyan #00e5ff, gold #ffd24d, red #ff4d6a. Fonts Rajdhani
  (display) + Outfit (body). Hex colors are hardcoded across every page.
- Layout: `AppShell.jsx` has a left sidebar with inline SVG icons and a top header.
  Pages render inside `<Outlet/>`.
- Pages: Login, Register, AuthCallback, Dashboard, Sales list, Sales detail
  (line items), Customer, Employee and Product lookups, Price history, Reports,
  Admin (users + rights), Deleted items (soft delete), Profile, Audit log
- Data model: a single-company sales DB (customer, employee, product, pricehist,
  sales, salesdetail) with 13 rights (SALES_VIEW/ADD/EDIT/DEL, SD_*, LOOKUP,
  ADM_USER) and roles SUPERADMIN / ADMIN / USER. It has soft-delete cascade
  triggers, RLS, SQL views and an audit log (`db/migrations/001–011`).
- License: README says MIT but there's no LICENSE file. Treat it as inspiration:
  reuse the structure and patterns and write the new code fresh.

# GOAL
Build **Pulse Sales** (placeholder name), a real, multi-tenant sales management
SaaS that keeps HOPE's page structure and UX flow (sales → line items → lookups
→ reports → admin/rights → audit) but is clearly a new product with a new look.
It has two kinds of dashboards:
1. **Tenant app**: each company's workspace (owners, managers, sales reps)
2. **Platform Admin console**: for me, the SaaS owner, to run the business

# NEW BRAND (replace the neon theme completely)
- Light-first, professional look, with dark mode as an option (toggle, saved per user)
- Tokens only (CSS variables + Tailwind config). No hardcoded hex anywhere.
  - Primary Indigo #4F46E5 | Accent Teal #14B8A6
  - Success #22C55E | Warning #F59E0B | Danger #EF4444
  - Light: bg #F8FAFC, surface #FFFFFF, border #E2E8F0, text #0F172A, muted #64748B
  - Dark: bg #0B1020, surface #121831, border #1E2747, text #E2E8F0, muted #94A3B8
  - Sidebar: gradient #312E81 → #4C1D95, white icons
- Font: Inter (tabular numbers for money). Radius 12px, soft shadows.
- Icons: lucide-react (replace all inline SVGs). Keep subtle framer-motion entrances.

# TECH STACK
Next.js 15 (App Router) + TypeScript strict + Tailwind + shadcn/ui · Supabase
(Postgres/Auth/RLS/Storage) + Drizzle ORM · TanStack Query & Table · React Hook
Form + Zod · Recharts · Stripe · Resend · Vitest + Playwright · Vercel

# MULTI-TENANCY (the biggest change from HOPE)
- `organizations` table. Every business table gets `organization_id`, and RLS
  isolates tenants using `organization_members`.
- Port HOPE's schema as tenant-scoped tables: customers, employees→members,
  products, price_history, sales, sale_items. Keep the soft-delete cascade and the
  audit log triggers, now per org.
- Keep HOPE's granular **rights** idea but make it per org: tenant roles are
  Owner / Admin / Manager / Rep, each with an editable rights matrix.
- Platform roles live separately: `platform_admins` (super admin, support).
  They bypass tenant RLS only through server-side service-role routes, and
  every one of those actions is audit-logged.

# TENANT APP (port and upgrade each HOPE page)
- **Dashboard**: KPI cards (revenue, sales count, avg order, top product) with
  sparklines and % change; revenue trend; top reps; top customers; recent sales;
  a date-range filter
- **Sales + Sale detail**: the HOPE CRUD flow, line items with price autofill
  from price history, soft delete/restore
- **Lookups**: Customers, Team (employees), Products, Price history, each with
  search, sort, pagination and CSV import/export
- **Reports**: sales by period, product, rep and customer. Export to PDF/XLSX.
- **Team & Rights**: invite by email, activate/deactivate, rights matrix editor
- **Deleted items**, **Audit log**, **Profile**
- **Settings**: org profile, logo, currency, tax, billing (Stripe customer portal)

# PLATFORM ADMIN CONSOLE (`/admin`, platform admins only)
- **Overview dashboard**: MRR, ARR, active orgs, new signups, trial→paid
  conversion, churn, ARPU, plus charts over time
- **Organizations**: list/search, plan, seats, usage, status; detail page;
  suspend/reactivate; extend trial; "view as" (read-only, logged in the audit log)
- **Users**: global user search, disable, reset auth, see org memberships
- **Billing**: subscriptions, failed payments, invoices (synced via Stripe webhooks)
- **Plans & feature flags**: Free / Pro / Business limits (seats, records, exports)
- **Platform audit log** + system health (error log, webhook events)
- **Announcements**: banner message to all tenants or to one org

# BILLING
Stripe Checkout + Customer Portal. Plans: Free (1 user, 100 sales/mo),
Pro $19/user/mo, Business $39/user/mo. 14-day trial. Webhooks sync to a
`subscriptions` table, and limits are enforced on the server.

# SECURITY
RLS on every table, Zod on every input, service-role key only on the server,
rate-limit auth routes, audit log for every write and every admin action.

# PHASES (stop after each one; report the files changed, how to run them, what to test)
1. Scaffold the Next.js repo, design tokens, AppShell (sidebar + header), theme toggle
2. Schema + migrations + RLS + seed (2 orgs, 6 users, 50 customers, 30 products,
   300 sales) + 1 platform admin
3. Auth (email + Google), onboarding (create org), invites, roles/rights
4. Sales + sale detail + lookups (port from HOPE)
5. Dashboard + Reports + exports
6. Deleted items + Audit log + Team & Rights UI
7. Stripe billing + plan limits
8. Platform Admin console
9. Polish: empty/loading/error states, mobile, WCAG AA, Lighthouse 90+
10. README, .env.example, Vercel deploy guide, tests (RLS isolation, rights, webhooks)

# RULES
- Every button works. No mock data in shipped screens (only the seed).
- Don't copy HOPE branding, team names or course info.
- Pick sensible defaults and note them. Only ask when you're truly blocked.
