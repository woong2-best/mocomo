import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { createPostForUser, type CreatePostInput } from "@/lib/create-post-core";
import { SETTLEMENT_ACCOUNT_REQUIRED_CODE } from "@/lib/settlement-account";
import type { MediaType } from "@prisma/client";
import { clampMediaInt } from "@/lib/video-metadata";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-posts-create", 20);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in authResult) return authResult.error;

  let body: CreatePostInput;
  try {
    body = (await req.json()) as CreatePostInput;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: authResult.user.id },
    select: { id: true, username: true, isBanned: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 401 });
  }

  const media = (body.media ?? []).map((m) => ({
    url: String(m.url ?? ""),
    type: (m.type === "VIDEO" ? "VIDEO" : "IMAGE") as MediaType,
    priceKrw: typeof m.priceKrw === "number" ? m.priceKrw : undefined,
    width: clampMediaInt(m.width),
    height: clampMediaInt(m.height),
    duration: clampMediaInt(m.duration, 86_400),
  }));

  const poll =
    body.poll && typeof body.poll === "object"
      ? {
          options: Array.isArray(body.poll.options)
            ? body.poll.options.map(String)
            : [],
          durationMinutes: Number(body.poll.durationMinutes) || 1440,
        }
      : undefined;

  const contentRating =
    body.contentRating === "ADULT" || body.contentRating === "GENERAL"
      ? body.contentRating
      : Boolean(body.isNsfw)
        ? "ADULT"
        : "GENERAL";

  const result = await createPostForUser(user, {
    content: String(body.content ?? ""),
    title: body.title ? String(body.title) : undefined,
    contentRating,
    isNsfw: contentRating === "ADULT",
    tagNames: Array.isArray(body.tagNames) ? body.tagNames.map(String) : [],
    media,
    poll,
    collaboratorUserIds: Array.isArray(body.collaboratorUserIds)
      ? body.collaboratorUserIds.map(String)
      : [],
    communityId: body.communityId ? String(body.communityId) : undefined,
    isAnonymous: Boolean(body.isAnonymous),
    quotedPostId: body.quotedPostId ? String(body.quotedPostId) : undefined,
  });

  if (result.error && !result.postId) {
    if ("code" in result && result.code === SETTLEMENT_ACCOUNT_REQUIRED_CODE) {
      return NextResponse.json(result, { status: 400 });
    }
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json({
    postId: result.postId,
    ...(result.error ? { warning: result.error } : {}),
  });
}
