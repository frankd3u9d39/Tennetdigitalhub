import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { adjustBalance, getUserDetail, resetTwoFactor, setAdmin, setSuspended } from "@/lib/admin";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json(await getUserDetail((await ctx.params).id));
  } catch (err) {
    return adminError(err);
  }
}

// POST { action: "adjust" | "suspend" | "unsuspend" | "reset_2fa" | "make_admin" | "remove_admin", note, direction?, amount? }
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  const b = (await req.json().catch(() => null)) as { action?: string; note?: string; direction?: string; amount?: number } | null;
  if (!b) return json({ error: "Invalid request." }, 400);
  try {
    switch (b.action) {
      case "adjust":
        return json(await adjustBalance(g.admin.email, id, b.direction as "credit" | "debit", Number(b.amount), b.note));
      case "suspend":
      case "unsuspend":
        await setSuspended(g.admin.email, id, b.action === "suspend", b.note);
        return json({ ok: true });
      case "make_admin":
      case "remove_admin":
        await setAdmin(g.admin.email, id, b.action === "make_admin", b.note);
        return json({ ok: true });
      case "reset_2fa":
        return json(await resetTwoFactor(g.admin.email, id, b.note));
      default:
        return json({ error: "Unknown action." }, 400);
    }
  } catch (err) {
    return adminError(err);
  }
}
