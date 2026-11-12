import "server-only";

// A tiny fixed-window rate limiter kept in process memory.
//
// NOTE: serverless instances each keep their own counters, so this is a best-effort guard against a single client
// hammering one endpoint, not a globally exact quota. For anything that must be exact (money, verification charges),
// enforce it in the database instead — this is only for cheap protective throttling.

const buckets = new Map<string, { count: number; resetAt: number }>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
}

/** Returns ok=false once `key` has been used `limit` times within `windowMs`. */
export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true, retryAfterSeconds: 0 };
}
