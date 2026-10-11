import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { FundingError, verifyAndCredit } from "@/lib/funding";
import { PaystackConfigError, PaystackUnavailableError } from "@/lib/paystack";

// GET /api/wallet/fund/verify?reference=TDF…  → { status: "success" | "pending" | "failed", amountNaira }
// Confirms the payment with Paystack and credits the wallet (once). Safe to call repeatedly.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const reference = req.nextUrl.searchParams.get("reference") ?? "";
  if (!/^[A-Z0-9]{8,60}$/.test(reference)) {
    return NextResponse.json({ error: "reference is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(await verifyAndCredit(user.email, reference));
  } catch (err) {
    if (err instanceof FundingError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof PaystackConfigError || err instanceof PaystackUnavailableError) {
      console.error("[funding] verify:", err.message);
      return NextResponse.json({ error: "We couldn't confirm the payment yet. Try again shortly." }, { status: 503 });
    }
    console.error("[funding] unexpected:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
