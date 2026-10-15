"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, requireRight } from "@/lib/auth";
import { formAction, guarded, type ActionState } from "@/lib/action";
import { assertCanCreateSale, audit, notify } from "@/lib/services";
import { priceOn } from "@/lib/queries";

const item = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid("Pick a product"),
  quantity: z.coerce.number().positive("Qty must be > 0").max(1_000_000),
  unitPrice: z.coerce.number().min(0).max(100_000_000).optional(),
});

const saleSchema = z.object({
  id: z.string().uuid().optional(),
  customerId: z.string().uuid("Pick a customer"),
  repId: z.string().uuid("Pick a rep"),
  saleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date"),
  status: z.enum(["draft", "completed", "cancelled"]),
  notes: z.string().max(2000).optional().transform((v) => v || null),
  items: z
    .string()
    .transform((s, ctx) => {
      try {
        return JSON.parse(s);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid items" });
        return z.NEVER;
      }
    })
    .pipe(z.array(item).min(1, "Add at least one line item").max(200)),
});

const round = (n: number) => Math.round(n * 100) / 100;

const saveSaleImpl = formAction(saleSchema, async (d) => {
  const t = await requireRight(d.id ? "SALES_EDIT" : "SALES_ADD");
  const orgId = t.org.id;

  // Every referenced row must belong to this org.
  const [customer] = await db
    .select({ id: schema.customers.id })
    .from(schema.customers)
    .where(and(eq(schema.customers.id, d.customerId), eq(schema.customers.organizationId, orgId), isNull(schema.customers.deletedAt)));
  if (!customer) throw new ActionError("Customer not found.");

  const repId = t.can("SALES_VIEW_ALL") ? d.repId : t.user.id; // reps can only book sales for themselves
  const [rep] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(and(eq(schema.members.userId, repId), eq(schema.members.organizationId, orgId)));
  if (!rep) throw new ActionError("Rep is not a member of this workspace.");

  const productIds = [...new Set(d.items.map((i) => i.productId))];
  const found = await db
    .select({ id: schema.products.id })
    .from(schema.products)
    .where(and(inArray(schema.products.id, productIds), eq(schema.products.organizationId, orgId), isNull(schema.products.deletedAt)));
  if (found.length !== productIds.length) throw new ActionError("One or more products were not found.");

  // Price autofill: when no price is given, use the price effective on the sale date.
  const lines = await Promise.all(
    d.items.map(async (i) => {
      const unitPrice = i.unitPrice ?? (await priceOn(orgId, i.productId, d.saleDate));
      if (unitPrice == null) throw new ActionError("A product has no price on that date. Add one in Price history.");
      return { ...i, unitPrice: round(unitPrice), lineTotal: round(unitPrice * i.quantity) };
    }),
  );
  const subtotal = round(lines.reduce((s, l) => s + l.lineTotal, 0));
  const tax = round((subtotal * t.org.taxRate) / 100);
  const header = { customerId: d.customerId, repId, saleDate: d.saleDate, status: d.status, notes: d.notes, subtotal, tax, total: round(subtotal + tax) };

  let saleId = d.id;
  if (!d.id) await assertCanCreateSale(t);

  await db.transaction(async (tx) => {
    if (d.id) {
      const [before] = await tx
        .select()
        .from(schema.sales)
        .where(and(eq(schema.sales.id, d.id), eq(schema.sales.organizationId, orgId), isNull(schema.sales.deletedAt)));
      if (!before) throw new ActionError("Sale not found.");
      if (!t.can("SALES_VIEW_ALL") && before.repId !== t.user.id) throw new ActionError("You can only edit your own sales.");
      const [after] = await tx.update(schema.sales).set({ ...header, updatedAt: new Date() }).where(eq(schema.sales.id, d.id)).returning();

      const keep = lines.filter((l) => l.id).map((l) => l.id!);
      await tx
        .update(schema.saleItems)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.saleItems.saleId, d.id),
            isNull(schema.saleItems.deletedAt),
            keep.length ? notInArray(schema.saleItems.id, keep) : undefined,
          ),
        );
      for (const l of lines) {
        const values = { productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal };
        if (l.id) await tx.update(schema.saleItems).set({ ...values, updatedAt: new Date() }).where(and(eq(schema.saleItems.id, l.id), eq(schema.saleItems.saleId, d.id)));
        else await tx.insert(schema.saleItems).values({ ...values, saleId: d.id, organizationId: orgId, createdBy: t.user.id });
      }
      await audit({ orgId, actorId: t.user.id, entity: "sale", entityId: d.id, action: "update", before, after: { ...after, items: lines } }, tx);
    } else {
      const [{ next }] = await tx
        .update(schema.organizations)
        .set({ nextSaleNo: sql`${schema.organizations.nextSaleNo} + 1` })
        .where(eq(schema.organizations.id, orgId))
        .returning({ next: sql<number>`${schema.organizations.nextSaleNo} - 1` });
      const [sale] = await tx
        .insert(schema.sales)
        .values({ ...header, number: next!, organizationId: orgId, createdBy: t.user.id })
        .returning();
      saleId = sale!.id;
      await tx.insert(schema.saleItems).values(
        lines.map((l) => ({ saleId: sale!.id, organizationId: orgId, createdBy: t.user.id, productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, lineTotal: l.lineTotal })),
      );
      await audit({ orgId, actorId: t.user.id, entity: "sale", entityId: sale!.id, action: "create", after: { ...sale, items: lines } }, tx);
    }
  });

  if (repId !== t.user.id) await notify(repId, orgId, d.id ? "A sale assigned to you was updated" : "A new sale was assigned to you", undefined, `/sales/${saleId}`);
  revalidatePath("/sales");
  revalidatePath("/dashboard");
  redirect(`/sales/${saleId}`);
});

export async function deleteSale(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("SALES_DEL");
    const id = z.string().uuid().parse(form.get("id"));
    await db.transaction(async (tx) => {
      const [before] = await tx
        .update(schema.sales)
        .set({ deletedAt: new Date() })
        .where(and(eq(schema.sales.id, id), eq(schema.sales.organizationId, t.org.id), isNull(schema.sales.deletedAt)))
        .returning();
      if (!before) throw new ActionError("Sale not found.");
      // Cascade soft delete to line items (ported from HOPE's cascade trigger).
      await tx.update(schema.saleItems).set({ deletedAt: before.deletedAt }).where(and(eq(schema.saleItems.saleId, id), isNull(schema.saleItems.deletedAt)));
      await audit({ orgId: t.org.id, actorId: t.user.id, entity: "sale", entityId: id, action: "delete", before }, tx);
    });
    revalidatePath("/sales");
    redirect("/sales");
  });
}

export async function saveSale(prev: ActionState, form: FormData) {
  return saveSaleImpl(prev, form);
}
