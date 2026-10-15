"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, requireRight } from "@/lib/auth";
import { formAction, guarded, type ActionState } from "@/lib/action";
import { audit } from "@/lib/services";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

// ── Customers ─────────────────────────────────────────────
const customerSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2, "Enter a name").max(120),
  email: z.union([z.literal(""), z.string().trim().email("Invalid email")]).optional().transform((v) => v || null),
  phone: opt(40),
  address: opt(300),
});

const saveCustomerImpl = formAction(customerSchema, async (d) => {
  const t = await requireRight("LOOKUP_EDIT");
  const { id, ...values } = d;
  if (id) {
    const [before] = await db.select().from(schema.customers).where(and(eq(schema.customers.id, id), eq(schema.customers.organizationId, t.org.id)));
    if (!before) throw new ActionError("Customer not found.");
    const [after] = await db.update(schema.customers).set({ ...values, updatedAt: new Date() }).where(eq(schema.customers.id, id)).returning();
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "customer", entityId: id, action: "update", before, after });
  } else {
    const [after] = await db.insert(schema.customers).values({ ...values, organizationId: t.org.id, createdBy: t.user.id }).returning();
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "customer", entityId: after!.id, action: "create", after });
  }
  revalidatePath("/customers");
  return { ok: true, message: id ? "Customer updated." : "Customer added." };
});

// ── Products ──────────────────────────────────────────────
const productSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().trim().min(1, "Required").max(40).transform((s) => s.toUpperCase()),
  name: z.string().trim().min(2, "Enter a name").max(120),
  unit: z.string().trim().min(1).max(20).default("pc"),
  price: z.union([z.literal(""), z.coerce.number().min(0)]).optional(),
});

const saveProductImpl = formAction(productSchema, async (d) => {
  const t = await requireRight("LOOKUP_EDIT");
  const { id, price, ...values } = d;
  const [dupe] = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(eq(schema.products.organizationId, t.org.id), eq(schema.products.sku, values.sku)));
  if (dupe && dupe.id !== id) return { fieldErrors: { sku: ["SKU already in use"] }, error: "That SKU already exists." };

  await db.transaction(async (tx) => {
    if (id) {
      const [before] = await tx.select().from(schema.products).where(and(eq(schema.products.id, id), eq(schema.products.organizationId, t.org.id)));
      if (!before) throw new ActionError("Product not found.");
      const [after] = await tx.update(schema.products).set({ ...values, updatedAt: new Date() }).where(eq(schema.products.id, id)).returning();
      await audit({ orgId: t.org.id, actorId: t.user.id, entity: "product", entityId: id, action: "update", before, after }, tx);
    } else {
      const [p] = await tx.insert(schema.products).values({ ...values, organizationId: t.org.id, createdBy: t.user.id }).returning();
      if (typeof price === "number")
        await tx.insert(schema.priceHistory).values({ productId: p!.id, unitPrice: price, effectiveDate: sql`current_date`, organizationId: t.org.id, createdBy: t.user.id });
      await audit({ orgId: t.org.id, actorId: t.user.id, entity: "product", entityId: p!.id, action: "create", after: { ...p, price } }, tx);
    }
  });
  revalidatePath("/products");
  return { ok: true, message: id ? "Product updated." : "Product added." };
});

// ── Prices ────────────────────────────────────────────────
const addPriceImpl = formAction(
  z.object({
    productId: z.string().uuid("Pick a product"),
    unitPrice: z.coerce.number().min(0, "Must be ≥ 0").max(100_000_000),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  }),
  async (d) => {
    const t = await requireRight("LOOKUP_EDIT");
    const [p] = await db.select({ id: schema.products.id }).from(schema.products).where(and(eq(schema.products.id, d.productId), eq(schema.products.organizationId, t.org.id)));
    if (!p) throw new ActionError("Product not found.");
    const [row] = await db.insert(schema.priceHistory).values({ ...d, organizationId: t.org.id, createdBy: t.user.id }).returning();
    await audit({ orgId: t.org.id, actorId: t.user.id, entity: "price", entityId: row!.id, action: "create", after: row });
    revalidatePath("/prices");
    revalidatePath(`/products/${d.productId}`);
    return { ok: true, message: "Price added." };
  },
);

// ── Soft delete for lookups ───────────────────────────────
const tables = { customer: schema.customers, product: schema.products, price: schema.priceHistory } as const;

export async function deleteLookup(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("LOOKUP_EDIT");
    const entity = z.enum(["customer", "product", "price"]).parse(form.get("entity"));
    const id = z.string().uuid().parse(form.get("id"));
    const table = tables[entity];
    if (entity === "customer") {
      const [used] = await db.select({ n: sql<number>`count(*)`.mapWith(Number) }).from(schema.sales).where(and(eq(schema.sales.customerId, id), isNull(schema.sales.deletedAt)));
      if (used!.n > 0) throw new ActionError(`This customer has ${used!.n} sale(s). Delete those first.`);
    }
    const [before] = await db
      .update(table)
      .set({ deletedAt: new Date() })
      .where(and(eq(table.id, id), eq(table.organizationId, t.org.id), isNull(table.deletedAt)))
      .returning();
    if (!before) throw new ActionError("Not found.");
    await audit({ orgId: t.org.id, actorId: t.user.id, entity, entityId: id, action: "delete", before });
    revalidatePath("/", "layout");
  });
}

// ── CSV import (rows already parsed and previewed on the client) ──
const importSchemas = {
  customers: z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().optional().or(z.literal("")), phone: z.string().max(40).optional(), address: z.string().max(300).optional() }),
  products: z.object({ sku: z.string().trim().min(1).max(40), name: z.string().trim().min(2).max(120), unit: z.string().trim().max(20).optional(), price: z.coerce.number().min(0).optional() }),
};

export async function importCsv(kind: "customers" | "products", rows: Record<string, string>[]) {
  return guarded(async () => {
    const t = await requireRight("LOOKUP_EDIT");
    if (rows.length > 5000) throw new ActionError("Import up to 5,000 rows at a time.");
    const parsed = rows.map((r) => importSchemas[kind].safeParse(r));
    const bad = parsed.findIndex((p) => !p.success);
    if (bad >= 0) throw new ActionError(`Row ${bad + 2} is invalid: ${(parsed[bad] as { error: z.ZodError }).error.issues[0]?.message}`);
    const data = parsed.map((p) => p.data!);

    let created = 0;
    let skipped = 0;
    await db.transaction(async (tx) => {
      if (kind === "customers") {
        const res = await tx
          .insert(schema.customers)
          .values(
            (data as z.infer<typeof importSchemas.customers>[]).map((r) => ({
              name: r.name,
              email: r.email || null,
              phone: r.phone || null,
              address: r.address || null,
              organizationId: t.org.id,
              createdBy: t.user.id,
            })),
          )
          .returning({ id: schema.customers.id });
        created = res.length;
      } else {
        for (const r of data as z.infer<typeof importSchemas.products>[]) {
          const [p] = await tx
            .insert(schema.products)
            .values({ sku: r.sku.toUpperCase(), name: r.name, unit: r.unit || "pc", organizationId: t.org.id, createdBy: t.user.id })
            .onConflictDoNothing()
            .returning();
          if (!p) {
            skipped++;
            continue;
          }
          created++;
          if (r.price != null)
            await tx.insert(schema.priceHistory).values({ productId: p.id, unitPrice: r.price, effectiveDate: sql`current_date`, organizationId: t.org.id, createdBy: t.user.id });
        }
      }
      await audit({ orgId: t.org.id, actorId: t.user.id, entity: kind, action: "import", after: { created, skipped } }, tx);
    });
    revalidatePath(`/${kind}`);
    return { ok: true, message: `Imported ${created} ${kind}${skipped ? `, skipped ${skipped} duplicate SKU(s)` : ""}.` };
  });
}

export async function saveCustomer(prev: ActionState, form: FormData) {
  return saveCustomerImpl(prev, form);
}

export async function saveProduct(prev: ActionState, form: FormData) {
  return saveProductImpl(prev, form);
}

export async function addPrice(prev: ActionState, form: FormData) {
  return addPriceImpl(prev, form);
}
