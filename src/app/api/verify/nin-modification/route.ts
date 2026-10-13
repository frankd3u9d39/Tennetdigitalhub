import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { orderNinModification, pollModificationStatus, ModificationError } from "@/lib/modifications";
import type { NinModificationInput } from "@/lib/checkmyninbvn";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
export const maxDuration = 60;

// POST /api/verify/nin-modification (Submit order)
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as (NinModificationInput & { consent?: boolean }) | null;
  if (!body || !body.service_type) {
    return NextResponse.json({ error: "Missing required modification details." }, { status: 400, headers: NO_STORE });
  }

  try {
    const res = await orderNinModification(user.email, {
      ...body,
      consent: body.consent === true,
    });
    return NextResponse.json(res, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ModificationError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[modification] error:", err);
    return NextResponse.json({ error: "Failed to submit modification order. You were not charged." }, { status: 500, headers: NO_STORE });
  }
}

// GET /api/verify/nin-modification?reference_id=... (Check status)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const referenceId = req.nextUrl.searchParams.get("reference_id");
  if (!referenceId) {
    return NextResponse.json({ error: "reference_id is required." }, { status: 400, headers: NO_STORE });
  }

  try {
    const statusData = await pollModificationStatus(referenceId);
    return NextResponse.json(statusData, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ModificationError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    return NextResponse.json({ error: "Could not fetch status." }, { status: 500, headers: NO_STORE });
  }
}
