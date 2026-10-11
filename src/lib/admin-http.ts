import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, type AuthUser } from "@/lib/auth-server";
import { AdminError } from "@/lib/admin";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

/**
 * Guard for every /api/admin route. Anyone who is not a signed-in, two-factor-verified admin gets a plain 404, so the
 * admin area does not even reveal that it exists. Changes (non-GET) must also come from this site itself.
 */
export async function adminGuard(req: NextRequest): Promise<{ admin: AuthUser; error: null } | { admin: null; error: NextResponse }> {
  const notFound = () => NextResponse.json({ error: "Not found." }, { status: 404, headers: NO_STORE });
  const admin = await getAdminUser();
  if (!admin) return { admin: null, error: notFound() };

  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin && new URL(origin).host !== req.headers.get("host")) {
      return { admin: null, error: NextResponse.json({ error: "Cross-site request refused." }, { status: 403, headers: NO_STORE }) };
    }
  }
  return { admin, error: null };
}

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: NO_STORE });

export function adminError(err: unknown) {
  if (err instanceof AdminError) return json({ error: err.message }, err.status);
  const message = err instanceof Error ? err.message : "";
  // Validation errors from settings are written for admins; anything else stays generic.
  if (/must be|malformed|incomplete|at most once|known provider/i.test(message)) return json({ error: message }, 400);
  console.error("[admin] unexpected error:", message);
  return json({ error: "Something went wrong." }, 500);
}
