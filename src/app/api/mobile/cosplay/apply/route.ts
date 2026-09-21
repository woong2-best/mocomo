import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  applyAsCosplayerForUser,
  COSPLAYER_BIO_MAX,
} from "@/lib/cosplayer-apply";

const bodySchema = z.object({
  bio: z.string().min(1).max(COSPLAYER_BIO_MAX),
  photoUrl: z.string().min(1).max(2048),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-cosplay-apply", 20);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const result = await applyAsCosplayerForUser(authResult.user.id, parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, username: result.username });
}
