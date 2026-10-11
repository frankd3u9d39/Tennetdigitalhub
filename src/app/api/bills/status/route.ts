import { NextRequest, NextResponse } from "next/server";
import { refreshPayment } from "@/lib/bills";
import { billsError, requireUser } from "@/lib/bills-http";

// GET /api/bills/status?reference=TD…  → re-checks a pending payment and settles/refunds it if resolved.
export async function GET(req: NextRequest) {
  const { user, error } = await requireUser();
  if (error) return error;

  const reference = req.nextUrl.searchParams.get("reference") ?? "";
  if (!/^[A-Z0-9]{6,20}$/.test(reference)) {
    return NextResponse.json({ error: "reference is required." }, { status: 400 });
  }
  try {
    return NextResponse.json(await refreshPayment(user.email, reference));
  } catch (err) {
    return billsError(err);
  }
}
