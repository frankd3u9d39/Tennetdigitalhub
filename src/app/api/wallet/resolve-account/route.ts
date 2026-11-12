import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { resolveAccountName } from "@/lib/paystack";
import { rateLimit } from "@/lib/ratelimit";

// GET /api/wallet/resolve-account?accountNumber=...&bankCode=...
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const accountNumber = req.nextUrl.searchParams.get("accountNumber")?.replace(/\D/g, "") ?? "";
  const bankCode = req.nextUrl.searchParams.get("bankCode")?.trim() ?? "";

  if (accountNumber.length !== 10 || !bankCode) {
    return NextResponse.json({ error: "Invalid account number or bank code." }, { status: 400 });
  }

  // This calls Paystack on every request; throttle so one account can't enumerate names or run up usage.
  const limit = rateLimit(`resolve:${user.uid}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many account checks. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
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
