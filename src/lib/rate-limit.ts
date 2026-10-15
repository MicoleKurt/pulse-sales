import "server-only";
import { headers } from "next/headers";
import { ActionError } from "./auth";

// In-memory fixed window limiter. Fine for a single local/server instance;
// swap for Redis/Upstash when running multiple instances.
const hits = new Map<string, { n: number; reset: number }>();

export async function rateLimit(bucket: string, limit = 10, windowMs = 60_000) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || entry.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  entry.n++;
  if (entry.n > limit) throw new ActionError("Too many attempts. Please wait a minute and try again.");
}
