import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { FundingError, startFunding, simulateTestDeposit, isPaystackTestMode } from "@/lib/funding";
import { PaystackConfigError, PaystackUnavailableError } from "@/lib/paystack";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ isTestMode: isPaystackTestMode() });
}

// POST /api/wallet/fund { amountNaira, simulate?: boolean }
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { amountNaira?: unknown; simulate?: boolean } | null;
  const amountNaira = Number(body?.amountNaira);

  try {
    if (body?.simulate && isPaystackTestMode()) {
      const res = await simulateTestDeposit(user.email, amountNaira);
      return NextResponse.json({ simulated: true, ...res });
    }

    const base = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;
    const { authorizationUrl } = await startFunding(user.email, amountNaira, `${base}/wallet/funded`);
    return NextResponse.json({ authorizationUrl });
  } catch (err) {
    if (err instanceof FundingError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err instanceof PaystackConfigError) {
      console.error("[funding] not configured:", err.message);
      return NextResponse.json({ error: "Wallet funding is not available yet." }, { status: 503 });
    }
    if (err instanceof PaystackUnavailableError) {
      console.error("[funding] paystack unavailable:", err.message);
      return NextResponse.json({ error: "Payments are temporarily unavailable. Try again shortly." }, { status: 503 });
    }
    console.error("[funding] unexpected:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

