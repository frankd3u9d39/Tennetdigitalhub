import { NextRequest } from "next/server";
import { adminError, adminGuard, json } from "@/lib/admin-http";
import { listUsers } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const g = await adminGuard(req);
  if (g.error) return g.error;
  try {
    return json({ users: await listUsers(req.nextUrl.searchParams.get("q") ?? undefined) });
  } catch (err) {
    return adminError(err);
  }
}
