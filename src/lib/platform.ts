import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const rows = async <T,>(q: ReturnType<typeof sql>) => (await db.execute(q)) as unknown as T[];

/** SaaS metrics for the platform console. MRR = seats × plan price for live paid subscriptions. */
export async function platformMetrics() {
  const [m] = await rows<{
    mrr: string;
    paying: string;
    orgs: string;
    active_orgs: string;
    suspended: string;
    trialing: string;
    users: string;
    signups_30: string;
    signups_prev_30: string;
    churned_30: string;
    converted: string;
    trialed: string;
  }>(sql`
    with live as (
      select s.organization_id, s.seats * l.price_per_seat as mrr
      from subscriptions s join plan_limits l on l.plan = s.plan
      where s.status in ('active','past_due') and s.plan <> 'free'
    )
    select
      coalesce((select sum(mrr) from live), 0) as mrr,
      (select count(*) from live) as paying,
      (select count(*) from organizations) as orgs,
      (select count(*) from organizations where status = 'active') as active_orgs,
      (select count(*) from organizations where status = 'suspended') as suspended,
      (select count(*) from organizations where plan = 'free' and trial_ends_at > now()) as trialing,
      (select count(*) from users) as users,
      (select count(*) from users where created_at > now() - interval '30 days') as signups_30,
      (select count(*) from users where created_at between now() - interval '60 days' and now() - interval '30 days') as signups_prev_30,
      (select count(*) from subscriptions where status = 'canceled' and updated_at > now() - interval '30 days') as churned_30,
      (select count(*) from organizations where plan <> 'free') as converted,
      (select count(*) from organizations where trial_ends_at is not null or plan <> 'free') as trialed
  `);
  const n = (v: string) => Number(v ?? 0);
  const mrr = n(m!.mrr);
  const paying = n(m!.paying);
  return {
    mrr,
    arr: mrr * 12,
    paying,
    arpu: paying ? mrr / paying : 0,
    orgs: n(m!.orgs),
    activeOrgs: n(m!.active_orgs),
    suspended: n(m!.suspended),
    trialing: n(m!.trialing),
    users: n(m!.users),
    signups30: n(m!.signups_30),
    signupsPrev30: n(m!.signups_prev_30),
    churnRate: paying + n(m!.churned_30) ? (n(m!.churned_30) / (paying + n(m!.churned_30))) * 100 : 0,
    conversion: n(m!.trialed) ? (n(m!.converted) / n(m!.trialed)) * 100 : 0,
  };
}

export async function signupsByMonth() {
  return rows<{ month: string; users: number; orgs: number }>(sql`
    with months as (select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as m)
    select to_char(m, 'Mon YY') as month,
      (select count(*)::int from users u where date_trunc('month', u.created_at) = m) as users,
      (select count(*)::int from organizations o where date_trunc('month', o.created_at) = m) as orgs
    from months order by m`);
}

export async function mrrByPlan() {
  return rows<{ plan: string; mrr: number; orgs: number }>(sql`
    select o.plan::text as plan,
      coalesce(sum(case when s.status in ('active','past_due') then s.seats * l.price_per_seat end), 0)::float as mrr,
      count(*)::int as orgs
    from organizations o
    left join subscriptions s on s.organization_id = o.id
    join plan_limits l on l.plan = o.plan
    group by o.plan order by o.plan`);
}

export async function revenueByMonth() {
  return rows<{ month: string; revenue: number }>(sql`
    with months as (select generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') as m)
    select to_char(m, 'Mon YY') as month,
      coalesce((select sum(amount)::float from invoices i where i.status = 'paid' and date_trunc('month', i.created_at) = m), 0) as revenue
    from months order by m`);
}
