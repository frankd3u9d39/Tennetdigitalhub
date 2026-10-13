import "server-only";
import type { ProviderName } from "./bill-providers/types";

// A provider pays for orders out of a prepaid balance that we load ourselves. Before taking a customer's money we check
// that the balance can cover the order, so a customer is never charged for something we already know cannot be
// delivered. Checks are cached briefly; the cache is dropped right after each order (the balance just changed).

const TTL_MS = 30_000;
const cache = new Map<ProviderName, { at: number; value: number | null }>();

async function fetchBalance(name: ProviderName): Promise<number | null> {
  const signal = AbortSignal.timeout(4_000);
  if (name === "ayglobal") {
    const key = process.env.AYGLOBAL_API_KEY;
    if (!key) return null;
    const base = (process.env.AYGLOBAL_BASE_URL || "https://ayglobaldata.com").replace(/\/+$/, "");
    const res = await fetch(`${base}/api/app/auth/userdata.php`, {
      headers: { Authorization: `Token ${key}` },
      signal,
      cache: "no-store",
    });
    const j = await res.json();
    const bal = Number(j?.data?.user?.balance);
    return Number.isFinite(bal) ? bal : null;
  }
  if (name === "checkmyninbvn") {
    const key = process.env.CHECKMYNINBVN_API_KEY;
    if (!key) return null;
    const base = (process.env.CHECKMYNINBVN_BASE_URL || "https://checkmyninbvn.com/api").replace(/\/+$/, "");
    const res = await fetch(`${base}/balance`, {
      headers: { "x-api-key": key },
      signal,
      cache: "no-store",
    });
    const j = await res.json();
    const bal = Number(j?.data?.balance);
    return Number.isFinite(bal) ? bal : null;
  }
  if (name === "vtugate") {
    // The sandbox balance is not real money, so there is nothing to protect.
    if (process.env.VTUGATE_ENV !== "live") return null;
    const key = process.env.VTUGATE_API_KEY;
    if (!key) return null;
    const res = await fetch("https://api.vtugate.com/api/v1/accountdetails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "",
      signal,
      cache: "no-store",
    });
    const n = Number((await res.json())?.data?.wallet_balance);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * The provider's available balance in naira, or null when it can't be known (sandbox, no balance API, or the balance
 * check itself failed). Unknown means "go ahead": a check outage must not stop all sales, and an order the provider
 * then rejects is refunded anyway.
 */
export async function getProviderBalance(name: ProviderName): Promise<number | null> {
  const hit = cache.get(name);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  let value: number | null = null;
  try {
    value = await fetchBalance(name);
  } catch (err) {
    console.error(`[balance] ${name} balance check failed:`, err instanceof Error ? err.message : err);
  }
  cache.set(name, { at: Date.now(), value });
  return value;
}

export function invalidateProviderBalance(name: ProviderName) {
  cache.delete(name);
}
