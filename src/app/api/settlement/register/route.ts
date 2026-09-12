import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { registerCreatorSettlement } from "@/actions/settlement-register";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "settlement-register", 5);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "요청 본문이 필요합니다." }, { status: 400 });
  }

  const result = await registerCreatorSettlement(body);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result);
}
