import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { createPostForUser, type CreatePostInput } from "@/lib/create-post-core";
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
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: authResult.user.id },
    select: { id: true, username: true, isBanned: true },
  });
  if (!user) {
    return NextResponse.json({ error: "계정 정보를 찾을 수 없습니다." }, { status: 401 });
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
  });

  if (result.error && !result.postId) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    postId: result.postId,
    ...(result.error ? { warning: result.error } : {}),
  });
}
