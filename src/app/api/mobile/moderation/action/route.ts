import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { applyModeratorAction, canModerateContent } from "@/lib/operator-sanctions";

const schema = z.object({
  action: z.enum([
    "CONTENT_REMOVE",
    "SUSPEND_24H",
    "SUSPEND_3D",
    "SUSPEND_5D",
    "SUSPEND_PERMANENT",
  ]),
  targetType: z.enum(["POST", "USED_LISTING", "MARKETPLACE_LISTING"]),
  targetId: z.string().min(1).max(80),
  reason: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-moderation-action", 20);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;
  if (!canModerateContent(auth.user)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const result = await applyModeratorAction({
    actorId: auth.user.id,
    ...parsed.data,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
