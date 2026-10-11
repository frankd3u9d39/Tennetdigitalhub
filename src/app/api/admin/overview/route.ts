import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { getOverview } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json(await getOverview(Number(req.nextUrl.searchParams.get("days") ?? 7)));
  } catch (err) {
    return adminError(err);
  }
}
