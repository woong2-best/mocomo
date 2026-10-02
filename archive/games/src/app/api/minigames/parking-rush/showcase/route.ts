import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  bestParkingShowcase,
  saveParkingShowcase,
  type ShowcaseData,
} from "@/lib/minigames/parking-rush-postgame";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const username = req.nextUrl.searchParams.get("username");

  try {
    let uid = userId;
    if (!uid && username) {
      const user = await db.user.findFirst({
        where: { username: username.replace(/^@/, "") },
        select: { id: true },
      });
      uid = user?.id ?? null;
    }
    if (!uid) return NextResponse.json({ error: "userId or username required" }, { status: 400 });

    const showcase = await bestParkingShowcase(db, uid);
    return NextResponse.json({ showcase });
  } catch {
    return NextResponse.json({ showcase: null });
  }
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = (await req.json()) as ShowcaseData;
    if (!body?.vehicleId || typeof body.score !== "number") {
      return NextResponse.json({ error: "Invalid showcase" }, { status: 400 });
    }
    await saveParkingShowcase(db, session.user.id, body);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
