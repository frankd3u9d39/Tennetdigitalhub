import { NextRequest, NextResponse } from "next/server";
import { recordVerification } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { type, queried, subjectName, status, cost } = (await req.json()) as {
    type: string;
    queried: string;
    subjectName?: string;
    status: string;
    cost: number;
  };

  if (!type || !queried || !status || cost == null) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const id = await recordVerification({
      type,
      queried,
      subjectName,
      status,
      cost,
      email: user.email,
    });
    return NextResponse.json({ id });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to record verification." },
      { status: 500 }
    );
  }
}
