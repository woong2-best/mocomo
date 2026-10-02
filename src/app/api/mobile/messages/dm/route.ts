import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getOrCreateDmForUser } from "@/lib/chat-dm-service";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-dm", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "dm" });
  if ("error" in authResult) return authResult.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  const result = await getOrCreateDmForUser(authResult.user.id, parsed.data.userId);
  if ("error" in result) {
    return NextResponse.json(
      { error: errorText(result.error), requiredTier: "requiredTier" in result ? result.requiredTier : undefined },
      { status: 400 }
    );
  }
  return NextResponse.json({ roomId: result.roomId });
}
