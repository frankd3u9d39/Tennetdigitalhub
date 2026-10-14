import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { resolveAccountName } from "@/lib/paystack";

// GET /api/wallet/resolve-account?accountNumber=...&bankCode=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const accountNumber = req.nextUrl.searchParams.get("accountNumber")?.replace(/\D/g, "") ?? "";
  const bankCode = req.nextUrl.searchParams.get("bankCode")?.trim() ?? "";

  if (accountNumber.length !== 10 || !bankCode) {
    return NextResponse.json({ error: "Invalid account number or bank code." }, { status: 400 });
  }

  try {
    const resolved = await resolveAccountName(accountNumber, bankCode);
    return NextResponse.json({ accountName: resolved.account_name, accountNumber: resolved.account_number });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not resolve account." },
      { status: 422 }
    );
  }
}
