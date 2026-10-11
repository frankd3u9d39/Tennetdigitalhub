import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { IdentityError, lookupIdentity } from "@/lib/identity";

// Personal data must never be cached by the browser, a proxy, or the CDN.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// A single lookup can take up to ~45s (provider call).
export const maxDuration = 60;

// POST /api/verify/lookup { type: "nin" | "bvn", number, consent: true }
// The server debits the wallet, asks the provider, and refunds unless the customer receives a result.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as { type?: string; number?: unknown; consent?: unknown; expectedPrice?: unknown } | null;
  if (!body || (body.type !== "nin" && body.type !== "bvn")) {
    return NextResponse.json({ error: "type must be nin or bvn." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await lookupIdentity({
      email: user.email,
      type: body.type,
      number: String(body.number ?? ""),
      consent: body.consent === true,
      expectedPrice: body.expectedPrice,
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof IdentityError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[identity] unexpected error");
    return NextResponse.json({ error: "Something went wrong. You were not charged if no result was shown." }, { status: 500, headers: NO_STORE });
  }
}
