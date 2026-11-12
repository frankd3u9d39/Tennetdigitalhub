import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";
import { WITHDRAWAL_BANKS } from "@/lib/banks";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ banks: WITHDRAWAL_BANKS });
}
