import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { orderCacRegistration, CacError } from "@/lib/cac-orders";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  try {
    const formData = await req.formData();
    const type = formData.get("type") as "business_name" | "company_1m" | "ngo";
    const ownerFullname = String(formData.get("ownerFullname") || formData.get("owner_fullname") || "").trim();
    const passport = formData.get("passport") as File | null;

    if (!type || !ownerFullname || !passport) {
      return NextResponse.json({ error: "Please provide company type, owner full name, and passport photograph." }, { status: 400, headers: NO_STORE });
    }

    const res = await orderCacRegistration(user.email, {
      type,
      ownerFullname,
      passportBlob: passport,
      filename: passport.name || "passport.jpg",
    });

    return NextResponse.json(res, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof CacError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[cac] error:", err);
    return NextResponse.json({ error: "CAC submission failed. You were not charged." }, { status: 500, headers: NO_STORE });
  }
}
