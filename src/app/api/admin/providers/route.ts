import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { getProviderHealth } from "@/lib/admin";

// Live provider balances and status (read-only calls to AYGlobalData, VTUGate and Paystack; cached for a minute).
export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json({ providers: await getProviderHealth(req.nextUrl.searchParams.get("force") === "1") });
  } catch (err) {
    return adminError(err);
  }
}
