import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { listAudit } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json({ entries: await listAudit(Number(req.nextUrl.searchParams.get("limit") ?? 100)) });
  } catch (err) {
    return adminError(err);
  }
}
