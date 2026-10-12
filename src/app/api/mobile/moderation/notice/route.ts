import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import {
  getPendingSanctionNotice,
  markSanctionNoticeSeen,
} from "@/lib/operator-sanctions";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-moderation-notice", 60);
  if (limited) return limited;
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  const notice = await getPendingSanctionNotice(userId);
  return NextResponse.json({ notice });
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-moderation-notice-ack", 30);
  if (limited) return limited;
  const userId = await getMobileUserId(req);
  if (!userId) return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  let sanctionId: string | undefined;
  try {
    const json = (await req.json()) as { sanctionId?: string };
    sanctionId = json.sanctionId;
  } catch {
    /* optional body */
  }
  await markSanctionNoticeSeen(userId, sanctionId);
  return NextResponse.json({ ok: true });
}
