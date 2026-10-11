import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { listTransactions } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  const q = req.nextUrl.searchParams;
  try {
    return json(
      await listTransactions({
        status: q.get("status") ?? undefined,
        direction: q.get("direction") ?? undefined,
        provider: q.get("provider") ?? undefined,
        q: q.get("q") ?? undefined,
        days: q.get("days") ? Number(q.get("days")) : undefined,
        limit: q.get("limit") ? Number(q.get("limit")) : undefined,
        offset: q.get("offset") ? Number(q.get("offset")) : undefined,
      })
    );
  } catch (err) {
    return adminError(err);
  }
}
