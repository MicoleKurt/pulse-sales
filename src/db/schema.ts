import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};
const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" });

export const roleEnum = pgEnum("member_role", ["owner", "admin", "manager", "rep"]);
export const memberStatusEnum = pgEnum("member_status", ["active", "inactive"]);
export const planEnum = pgEnum("plan", ["free", "pro", "business"]);
export const orgStatusEnum = pgEnum("org_status", ["active", "suspended"]);
export const saleStatusEnum = pgEnum("sale_status", ["draft", "completed", "cancelled"]);
export const platformRoleEnum = pgEnum("platform_role", ["super", "support"]);

// ── Identity ──────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    avatarColor: text("avatar_color").notNull().default("primary"),
    disabled: boolean("disabled").notNull().default(false),
    lastOrgId: uuid("last_org_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_uq").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(), // sha256 of the cookie token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  impersonatingOrgId: uuid("impersonating_org_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_resets", {
  id: text("id").primaryKey(), // sha256 of token
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const platformAdmins = pgTable("platform_admins", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  role: platformRoleEnum("role").notNull().default("super"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Tenancy ───────────────────────────────────────────────
export const organizations = pgTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    currency: text("currency").notNull().default("USD"),
    taxRate: numeric("tax_rate", { precision: 5, scale: 2, mode: "number" }).notNull().default(0),
    plan: planEnum("plan").notNull().default("free"),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    status: orgStatusEnum("status").notNull().default("active"),
    nextSaleNo: integer("next_sale_no").notNull().default(1001),
    ...timestamps,
  },
  (t) => [uniqueIndex("org_slug_uq").on(t.slug)],
);

export const members = pgTable(
  "organization_members",
  {
    id: id(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("rep"),
    status: memberStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (t) => [uniqueIndex("member_org_user_uq").on(t.organizationId, t.userId)],
);

export const roleRights = pgTable(
  "role_rights",
  {
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull(),
    right: text("right_code").notNull(),
    allowed: boolean("allowed").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.organizationId, t.role, t.right] })],
);

export const invitations = pgTable("invitations", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: roleEnum("role").notNull().default("rep"),
  tokenHash: text("token_hash").notNull(),
  invitedBy: uuid("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Sales domain (all tenant scoped, soft-deletable) ──────
const tenant = {
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: uuid("created_by").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  ...timestamps,
};

export const customers = pgTable(
  "customers",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    ...tenant,
  },
  (t) => [index("customers_org_idx").on(t.organizationId)],
);

export const products = pgTable(
  "products",
  {
    id: id(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    unit: text("unit").notNull().default("pc"),
    ...tenant,
  },
  (t) => [index("products_org_idx").on(t.organizationId), uniqueIndex("products_org_sku_uq").on(t.organizationId, t.sku)],
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: id(),
    productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
    unitPrice: money("unit_price").notNull(),
    effectiveDate: date("effective_date").notNull(),
    ...tenant,
  },
  (t) => [index("price_product_idx").on(t.productId, t.effectiveDate)],
);

export const sales = pgTable(
  "sales",
  {
    id: id(),
    number: integer("number").notNull(),
    customerId: uuid("customer_id").notNull().references(() => customers.id),
    repId: uuid("rep_id").notNull().references(() => users.id),
    saleDate: date("sale_date").notNull(),
    status: saleStatusEnum("status").notNull().default("completed"),
    subtotal: money("subtotal").notNull().default(0),
    tax: money("tax").notNull().default(0),
    total: money("total").notNull().default(0),
    notes: text("notes"),
    ...tenant,
  },
  (t) => [
    index("sales_org_date_idx").on(t.organizationId, t.saleDate),
    uniqueIndex("sales_org_number_uq").on(t.organizationId, t.number),
  ],
);

export const saleItems = pgTable(
  "sale_items",
  {
    id: id(),
    saleId: uuid("sale_id").notNull().references(() => sales.id, { onDelete: "cascade" }),
    productId: uuid("product_id").notNull().references(() => products.id),
    quantity: numeric("quantity", { precision: 12, scale: 2, mode: "number" }).notNull(),
    unitPrice: money("unit_price").notNull(),
    lineTotal: money("line_total").notNull(),
    ...tenant,
  },
  (t) => [index("items_sale_idx").on(t.saleId)],
);

// ── Cross-cutting ─────────────────────────────────────────
export const auditLog = pgTable(
  "audit_log",
  {
    id: id(),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    scope: text("scope").notNull().default("tenant"), // tenant | platform
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_org_idx").on(t.organizationId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body"),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.createdAt)],
);

export const subscriptions = pgTable("subscriptions", {
  organizationId: uuid("organization_id").primaryKey().references(() => organizations.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull(),
  status: text("status").notNull(), // trialing | active | past_due | canceled
  seats: integer("seats").notNull().default(1),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  ...timestamps,
});

export const invoices = pgTable("invoices", {
  id: id(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  amount: money("amount").notNull(),
  status: text("status").notNull(), // paid | failed | open
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const planLimits = pgTable("plan_limits", {
  plan: planEnum("plan").primaryKey(),
  pricePerSeat: money("price_per_seat").notNull(),
  maxSeats: integer("max_seats"), // null = unlimited
  maxSalesPerMonth: integer("max_sales_per_month"),
  exports: boolean("exports").notNull(),
  auditLog: boolean("audit_log").notNull(),
  advancedReports: boolean("advanced_reports").notNull(),
});

export const announcements = pgTable("announcements", {
  id: id(),
  organizationId: uuid("organization_id").references(() => organizations.id, { onDelete: "cascade" }), // null = all
  message: text("message").notNull(),
  tone: text("tone").notNull().default("info"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdBy: uuid("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(), // provider event id, makes handling idempotent
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const outbox = pgTable("email_outbox", {
  id: id(),
  to: text("to").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Role = (typeof roleEnum.enumValues)[number];
export type Plan = (typeof planEnum.enumValues)[number];
