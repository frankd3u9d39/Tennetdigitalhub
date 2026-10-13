import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { retrieveIdentity, RetrievalError, type RetrievalType } from "@/lib/retrieval";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
export const maxDuration = 60;

// POST /api/verify/retrieval { type: "bvn_phone" | "nin_phone" | "nin_tracking", query, consent: true }
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as {
    type?: string;
    query?: string;
    consent?: boolean;
  } | null;

  if (!body || !body.type || !body.query) {
    return NextResponse.json({ error: "Missing required retrieval parameters." }, { status: 400, headers: NO_STORE });
  }

  const validTypes: RetrievalType[] = ["bvn_phone", "nin_phone", "nin_tracking"];
  if (!validTypes.includes(body.type as RetrievalType)) {
    return NextResponse.json({ error: "Invalid retrieval type." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await retrieveIdentity({
      email: user.email,
      type: body.type as RetrievalType,
      query: body.query,
      consent: body.consent === true,
    });
    return NextResponse.json(result, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof RetrievalError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[retrieval] unexpected error:", err);
    return NextResponse.json({ error: "Retrieval request failed. You were not charged." }, { status: 500, headers: NO_STORE });
  }
}
