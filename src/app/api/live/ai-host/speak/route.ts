import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { planHostReply } from "@/lib/ai-live/blocklist";
import { speakHostLine } from "@/lib/ai-live/host-reply";
import { isIdolId } from "@/lib/ai-live/idols";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "live-ai-host", 8);
  if (limited) return limited;

  const authResult = await requireApiUser({ writeKind: "comment" });
  if ("error" in authResult) return authResult.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const raw = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  const memberRaw = typeof (body as { member?: unknown })?.member === "string" ? (body as { member: string }).member : "";
  const member = isIdolId(memberRaw) ? memberRaw : null;
  const plan = planHostReply(raw);
  if (plan.kind === "ignore") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (plan.kind === "blocked") {
    return NextResponse.json({ text: plan.text, emotion: "angry", blocked: true, audioBase64: null });
  }

  const spoken = await speakHostLine(plan.text, member);
  return NextResponse.json({
    text: spoken.text,
    emotion: spoken.emotion,
    blocked: spoken.blocked,
    audioBase64: spoken.audio ? Buffer.from(spoken.audio).toString("base64") : null,
  });
}
