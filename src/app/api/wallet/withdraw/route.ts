import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { FundingError, withdrawFunds } from "@/lib/funding";

// POST /api/wallet/withdraw
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    amountNaira?: unknown;
    bankName?: unknown;
    bankCode?: unknown;
    accountNumber?: unknown;
    accountName?: unknown;
  } | null;

  const amountNaira = Number(body?.amountNaira);
  const bankName = String(body?.bankName ?? "").trim();
  const bankCode = body?.bankCode ? String(body.bankCode) : undefined;
  const accountNumber = String(body?.accountNumber ?? "").trim();
  const accountName = String(body?.accountName ?? "").trim();

  try {
    const outcome = await withdrawFunds(user.email, {
      amountNaira,
      bankName,
      bankCode,
      accountNumber,
      accountName,
    });
    return NextResponse.json({ success: true, ...outcome });
  } catch (err) {
    if (err instanceof FundingError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[withdrawal] unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong with the withdrawal." }, { status: 500 });
  }
}
