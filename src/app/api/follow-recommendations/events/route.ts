import { NextRequest, NextResponse } from "next/server";
import { RecommendationEventType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  onFollowFromRecommendation,
  recordRecommendationEvent,
} from "@/lib/follow-recommendations";

export const dynamic = "force-dynamic";

const ALLOWED = new Set<string>(Object.values(RecommendationEventType));

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "follow-rec-event", 90);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    candidateId?: string;
    eventType?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const candidateId = body.candidateId?.trim();
  const eventType = body.eventType?.trim();
  if (!candidateId || !eventType || !ALLOWED.has(eventType)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (candidateId === userId) {
    return NextResponse.json({ ok: true });
  }

  const source = body.source?.trim() || "profile_sidebar";

  try {
    if (eventType === "FOLLOW") {
      await onFollowFromRecommendation(userId, candidateId, source);
    } else {
      await recordRecommendationEvent({
        userId,
        candidateId,
        eventType: eventType as RecommendationEventType,
        source,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[api/follow-recommendations/events]", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
