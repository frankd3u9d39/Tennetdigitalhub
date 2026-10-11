import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { listFundings, recheckFunding } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json({ fundings: await listFundings(req.nextUrl.searchParams.get("status") ?? undefined) });
  } catch (err) {
    return adminError(err);
  }
}

// POST { reference } asks Paystack about this payment again and credits the wallet if it was paid (once).
export async function POST(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { reference?: string } | null;
  try {
    return json(await recheckFunding(g.admin.email, String(body?.reference ?? "")));
  } catch (err) {
    return adminError(err);
  }
}
