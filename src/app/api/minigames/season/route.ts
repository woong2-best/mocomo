import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const season = await db.minigameSeason.findFirst({
      where: { active: true },
      orderBy: { startsAt: "desc" },
    });
    return NextResponse.json({ season });
  } catch {
    return NextResponse.json({ season: null });
  }
}
