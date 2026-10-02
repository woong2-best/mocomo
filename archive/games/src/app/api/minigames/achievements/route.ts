import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { MINIGAME_ACHIEVEMENTS } from "@/lib/minigames/achievements";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const unlocked = await db.minigameUserAchievement.findMany({
      where: { userId: session.user.id },
    });
    const set = new Set(unlocked.map((u) => u.achievementId));
    return NextResponse.json({
      achievements: MINIGAME_ACHIEVEMENTS.map((a) => ({
        ...a,
        unlocked: set.has(a.id),
        unlockedAt: unlocked.find((u) => u.achievementId === a.id)?.unlockedAt ?? null,
      })),
    });
  } catch {
    return NextResponse.json({
      achievements: MINIGAME_ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, unlockedAt: null })),
    });
  }
}
