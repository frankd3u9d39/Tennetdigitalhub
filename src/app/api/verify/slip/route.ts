import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { IdentityError, slipIdentity } from "@/lib/identity";
import type { SlipTier } from "@/lib/identity-prices";

// The PDF holds a person's full details: never cache it.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// Generating a slip can take a while (provider call).
export const maxDuration = 90;

// POST /api/verify/slip { type: "nin" | "bvn", number, consent: true, tier: "standard" | "premium" }
// Charged separately from the lookup. Returns the PDF as base64 for the browser to download; nothing is stored here.
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as { type?: string; number?: unknown; consent?: unknown; tier?: string; expectedPrice?: unknown } | null;
  if (!body || (body.type !== "nin" && body.type !== "bvn")) {
    return NextResponse.json({ error: "type must be nin or bvn." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await slipIdentity({
      email: user.email,
      type: body.type,
      number: String(body.number ?? ""),
      consent: body.consent === true,
      tier: body.tier as SlipTier,
      expectedPrice: body.expectedPrice,
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof IdentityError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[identity] unexpected error");
    return NextResponse.json({ error: "Something went wrong. You were not charged if no slip was shown." }, { status: 500, headers: NO_STORE });
  }
}
