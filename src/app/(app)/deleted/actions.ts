"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { ActionError, requireRight } from "@/lib/auth";
import { guarded } from "@/lib/action";
import { audit } from "@/lib/services";

const tables = { sale: schema.sales, customer: schema.customers, product: schema.products, price: schema.priceHistory } as const;
const input = z.object({ entity: z.enum(["sale", "customer", "product", "price"]), id: z.string().uuid() });

export async function restoreItem(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("SALES_DEL");
    const { entity, id } = input.parse(Object.fromEntries(form));
    const table = tables[entity];
    await db.transaction(async (tx) => {
      const where = and(eq(table.id, id), eq(table.organizationId, t.org.id), isNotNull(table.deletedAt));
      const [current] = await tx.select({ deletedAt: table.deletedAt }).from(table).where(where);
      if (!current) throw new ActionError("Item not found.");
      const [row] = await tx.update(table).set({ deletedAt: null }).where(where).returning();
      // Cascade restore: only line items deleted together with the sale (same timestamp),
      // so items removed individually before stay removed.
      if (entity === "sale")
        await tx
          .update(schema.saleItems)
          .set({ deletedAt: null })
          .where(and(eq(schema.saleItems.saleId, id), eq(schema.saleItems.deletedAt, current.deletedAt!)));
      await audit({ orgId: t.org.id, actorId: t.user.id, entity, entityId: id, action: "restore", after: row }, tx);
    });
    revalidatePath("/", "layout");
  });
}

export async function purgeItem(_: unknown, form: FormData) {
  return guarded(async () => {
    const t = await requireRight("SALES_DEL");
    if (t.role !== "owner" && t.role !== "admin") throw new ActionError("Only owners and admins can permanently delete.");
    const { entity, id } = input.parse(Object.fromEntries(form));
    const table = tables[entity];
    try {
      const [row] = await db.delete(table).where(and(eq(table.id, id), eq(table.organizationId, t.org.id), isNotNull(table.deletedAt))).returning();
      if (!row) throw new ActionError("Item not found.");
      await audit({ orgId: t.org.id, actorId: t.user.id, entity, entityId: id, action: "purge", before: row });
    } catch (e) {
      if (e instanceof ActionError) throw e;
      throw new ActionError("This item is still referenced by other records (e.g. sales) and can't be purged.");
    }
    revalidatePath("/deleted");
  });
}
