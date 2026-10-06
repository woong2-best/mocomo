import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { canViewNsfwContent, nsfwViewerSelect } from "@/lib/nsfw-viewer-access";

/** GET — logged-in NSFW view gate (birth date + 19+). */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "me-nsfw-age", 60);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ allowed: false, hasBirthDate: false }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: nsfwViewerSelect,
  });

  return NextResponse.json({
    allowed: canViewNsfwContent(user),
    hasBirthDate: !!user?.birthDate,
  });
}
