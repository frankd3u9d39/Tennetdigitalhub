import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import {
  WithdrawalAdminError,
  listWithdrawals,
  markWithdrawalPaid,
  pendingWithdrawalSummary,
  rejectWithdrawal,
} from "@/lib/withdrawals";

// GET /api/admin/withdrawals?filter=pending|all   → { summary, withdrawals }
// GET /api/admin/withdrawals?summary=1            → { summary } (cheap; polled by the admin alert)
export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    const summary = await pendingWithdrawalSummary();
    if (req.nextUrl.searchParams.get("summary")) return json({ summary });
    const filter = req.nextUrl.searchParams.get("filter") === "all" ? "all" : "pending";
    return json({ summary, withdrawals: await listWithdrawals(filter) });
  } catch (err) {
    return adminError(err);
  }
}

// POST { reference, action: "paid", note? }    → the admin sent the money by hand
// POST { reference, action: "reject", note }    → refund the wallet (reason required, shown to the customer)
export async function POST(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { reference?: string; action?: string; note?: unknown } | null;
  const reference = String(body?.reference ?? "");
  try {
    if (!reference) return json({ error: "Missing reference." }, 400);
    if (body?.action === "paid") await markWithdrawalPaid(g.admin.email, reference, body.note);
    else if (body?.action === "reject") await rejectWithdrawal(g.admin.email, reference, body.note);
    else return json({ error: "Unknown action." }, 400);
    return json({ ok: true, summary: await pendingWithdrawalSummary() });
  } catch (err) {
    if (err instanceof WithdrawalAdminError) return json({ error: err.message }, err.status);
    return adminError(err);
  }
}
