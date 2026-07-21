import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  listFollowRecommendationsForUser,
  recordRecommendationEvent,
} from "@/lib/follow-recommendations";
import { REC_LIST_LIMIT } from "@/lib/follow-recommendations/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "follow-rec", 60);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ items: [], guest: true });
  }

  const limitParam = Number(req.nextUrl.searchParams.get("limit") ?? REC_LIST_LIMIT);
  const limit = Number.isFinite(limitParam)
    ? Math.min(20, Math.max(1, Math.floor(limitParam)))
    : REC_LIST_LIMIT;

  try {
    const items = await listFollowRecommendationsForUser(userId, limit);
    // 노출 이벤트 (비동기, 실패 무시)
    void Promise.all(
      items.map((item) =>
        recordRecommendationEvent({
          userId,
          candidateId: item.id,
          eventType: "IMPRESSION",
          source: "profile_sidebar",
          score: item.score,
          bucket: item.bucket,
        })
      )
    ).catch(() => {});

    return NextResponse.json({ items });
  } catch (e) {
    console.error("[api/follow-recommendations]", e);
    return NextResponse.json({ items: [], error: "failed" }, { status: 500 });
  }
}
