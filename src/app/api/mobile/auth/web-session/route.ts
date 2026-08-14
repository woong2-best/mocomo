import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { sealMobileWebSessionHandoff } from "@/lib/mobile-web-session-handoff";
import { getAppOrigin } from "@/lib/stripe";

const bodySchema = z.object({
  redirect: z.string().max(200).optional(),
});

/** 앱 로그인 → 웹 세션 쿠키 (판매자 온보딩 등) */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-web-session", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  let json: unknown = {};
  try {
    json = await req.json();
  } catch {
    /* empty body ok */
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const redirect = parsed.data.redirect?.startsWith("/")
    ? parsed.data.redirect
    : "/market/seller/register";

  const handoff = sealMobileWebSessionHandoff({
    userId: auth.user.id,
    redirect,
  });

  const origin = getAppOrigin();
  const url = `${origin}/api/auth/mobile/web-session?handoff=${encodeURIComponent(handoff)}`;

  return NextResponse.json({ url, redirect });
}
