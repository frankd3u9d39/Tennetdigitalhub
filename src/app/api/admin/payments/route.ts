import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { resolvePayment } from "@/lib/admin";

// POST { reference, action: "recheck" | "mark_success" | "refund", note } resolves a payment stuck in "pending".
export async function POST(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const body = (await req.json().catch(() => null)) as { reference?: string; action?: string; note?: string } | null;
  if (!body || !["recheck", "mark_success", "refund"].includes(String(body.action))) return json({ error: "Invalid action." }, 400);
  try {
    return json(await resolvePayment(g.admin.email, String(body.reference ?? ""), body.action as "recheck" | "mark_success" | "refund", body.note));
  } catch (err) {
    return adminError(err);
  }
}
