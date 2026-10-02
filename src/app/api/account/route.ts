import { NextResponse } from "next/server";
import { getAccountSnapshot } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  try {
    const snapshot = await getAccountSnapshot(user.email);
    return NextResponse.json(snapshot);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load account." },
      { status: 500 }
    );
  }
}
