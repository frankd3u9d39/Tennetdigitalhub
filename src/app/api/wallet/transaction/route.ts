import { NextRequest, NextResponse } from "next/server";
import { applyWalletTransaction } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { direction, amount, label, detail } = (await req.json()) as {
    direction: "credit" | "debit";
    amount: number;
    label: string;
    detail?: string;
  };

  if (direction !== "credit" && direction !== "debit") {
    return NextResponse.json({ error: "Invalid direction." }, { status: 400 });
  }
  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
  }
  if (!label) {
    return NextResponse.json({ error: "Label is required." }, { status: 400 });
  }

  try {
    const result = await applyWalletTransaction({
      direction,
      amount,
      label,
      detail,
      email: user.email,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transaction failed." },
      { status: 400 }
    );
  }
}
