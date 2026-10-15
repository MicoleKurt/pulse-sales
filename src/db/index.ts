import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) console.warn("DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.");

// postgres.js connects lazily, so a missing URL only fails on the first query (keeps `next build` working).
// Reuse one pool across hot reloads in dev.
const g = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };
const client = g.__pg ?? postgres(url ?? "postgres://localhost:5432/missing", { max: 10 });
if (process.env.NODE_ENV !== "production") g.__pg = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export type DB = typeof db;
export { schema };
