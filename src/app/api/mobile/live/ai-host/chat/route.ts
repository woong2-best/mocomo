import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { replyAsAiHost } from "@/lib/ai-live/host-reply";

/** Signed-in app chat. Bearer clients skip browser Origin checks on /api/mobile. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "ai-live-host", 8);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    text = typeof body.text === "string" ? body.text : "";
  } catch {
    return NextResponse.json({ error: "Enter a message.", code: "EMPTY" }, { status: 400 });
  }

  const result = await replyAsAiHost(text);
  if (!result.ok) {
    return NextResponse.json({ error: "Enter a message.", code: "EMPTY" }, { status: 400 });
  }
  return NextResponse.json({ text: result.text, blocked: result.blocked });
}
