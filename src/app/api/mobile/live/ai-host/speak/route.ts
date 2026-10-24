import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { planHostReply } from "@/lib/ai-live/blocklist";
import { speakHostLine } from "@/lib/ai-live/host-reply";
import { resolveLiveAvatarId } from "@/lib/ai-live/avatars";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Same host reply and voice as the website room. Bearer auth for the app. */
export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-ai-host", 8);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "comment" });
  if ("error" in authResult) return authResult.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }

  const raw = typeof (body as { text?: unknown })?.text === "string" ? (body as { text: string }).text : "";
  const rec = body as { characterId?: unknown; member?: unknown };
  const characterRaw =
    typeof rec.characterId === "string" ? rec.characterId : typeof rec.member === "string" ? rec.member : "";
  const characterId = resolveLiveAvatarId(characterRaw) ?? "zelie";
  const plan = planHostReply(raw, characterId);
  if (plan.kind === "ignore") {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (plan.kind === "blocked") {
    return NextResponse.json({ text: plan.text, emotion: "angry", blocked: true, audioBase64: null });
  }

  const spoken = await speakHostLine(plan.text, characterId);
  if (spoken.rateLimited) {
    return NextResponse.json(
      {
        text: spoken.text,
        emotion: spoken.emotion,
        blocked: false,
        rateLimited: true,
        audioBase64: null,
      },
      { status: 429 }
    );
  }
  if (spoken.exhausted) {
    return NextResponse.json(
      {
        text: spoken.text,
        emotion: spoken.emotion,
        blocked: false,
        exhausted: true,
        audioBase64: null,
      },
      { status: 502 }
    );
  }
  return NextResponse.json({
    text: spoken.text,
    emotion: spoken.emotion,
    blocked: spoken.blocked,
    audioBase64: spoken.audio ? Buffer.from(spoken.audio).toString("base64") : null,
  });
}
