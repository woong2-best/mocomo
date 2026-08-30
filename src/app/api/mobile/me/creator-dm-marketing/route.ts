import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  getCreatorMarketingSettings,
  saveCreatorWelcomeMessage,
} from "@/lib/creator-dm-marketing";

const welcomeSchema = z.object({
  enabled: z.boolean(),
  text: z.string().max(4000).optional(),
  mediaUrl: z.string().max(2048).nullable().optional(),
  mediaType: z.string().max(16).nullable().optional(),
  mediaName: z.string().max(200).nullable().optional(),
  mediaPriceKrw: z.number().int().min(0).nullable().optional(),
});

/** GET/PUT /api/mobile/me/creator-dm-marketing */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const settings = await getCreatorMarketingSettings(auth.user.id);
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `creator-dm-marketing:${auth.user.id}`, 30);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = welcomeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값을 확인해 주세요." }, { status: 400 });
  }

  const result = await saveCreatorWelcomeMessage(auth.user.id, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result.settings);
}
