import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { orderExamPin, ExamError } from "@/lib/exam-orders";

const NO_STORE = { "Cache-Control": "no-store, max-age=0" };
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401, headers: NO_STORE });

  const body = (await req.json().catch(() => null)) as { provider?: number; quantity?: number } | null;
  const provider = Number(body?.provider);
  const quantity = Math.max(1, Math.min(10, Number(body?.quantity) || 1));

  if (![1, 2, 3].includes(provider)) {
    return NextResponse.json({ error: "Invalid exam provider (1=WAEC, 2=NECO, 3=NABTEB)." }, { status: 400, headers: NO_STORE });
  }

  try {
    const res = await orderExamPin(user.email, provider as 1 | 2 | 3, quantity);
    return NextResponse.json(res, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ExamError) {
      return NextResponse.json({ error: err.message }, { status: err.status, headers: NO_STORE });
    }
    console.error("[exam] error:", err);
    return NextResponse.json({ error: "Exam PIN purchase failed. You were not charged." }, { status: 500, headers: NO_STORE });
  }
}
