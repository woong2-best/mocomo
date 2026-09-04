import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  completeMobilePasswordReset,
  resetCompleteSchema,
} from "@/lib/mobile-signup-auth";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-password-reset", 15);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = resetCompleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const result = await completeMobilePasswordReset(parsed.data);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
