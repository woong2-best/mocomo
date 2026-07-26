import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { createPostForUser, type CreatePostInput } from "@/lib/create-post-core";
import type { MediaType } from "@prisma/client";
import { clampMediaInt } from "@/lib/video-metadata";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "posts-create", 20);
  if (limited) return limited;

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "로그인이 필요합니다. 다시 로그인한 뒤 시도해 주세요." },
      { status: 401 }
    );
  }

  let body: CreatePostInput;
  try {
    body = (await req.json()) as CreatePostInput;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, isBanned: true },
  });
  if (!user) {
    return NextResponse.json(
      { error: "계정 정보를 찾을 수 없습니다. 다시 로그인해 주세요." },
      { status: 401 }
    );
  }

  const media = (body.media ?? []).map((m) => ({
    url: String(m.url ?? ""),
    type: (m.type === "VIDEO" ? "VIDEO" : "IMAGE") as MediaType,
    priceKrw: typeof m.priceKrw === "number" ? m.priceKrw : undefined,
    width: clampMediaInt(m.width),
    height: clampMediaInt(m.height),
    duration: clampMediaInt(m.duration, 86_400),
  }));

  const result = await createPostForUser(user, {
    content: String(body.content ?? ""),
    title: body.title ? String(body.title) : undefined,
    communityId: body.communityId ? String(body.communityId) : undefined,
    animeId: body.animeId ? String(body.animeId) : undefined,
    isNsfw: Boolean(body.isNsfw),
    tagNames: Array.isArray(body.tagNames) ? body.tagNames.map(String) : [],
    media,
    poll: body.poll
      ? {
          options: Array.isArray(body.poll.options)
            ? body.poll.options.map(String)
            : [],
          durationMinutes: Number(body.poll.durationMinutes),
        }
      : undefined,
    collaboratorUserIds: Array.isArray(body.collaboratorUserIds)
      ? body.collaboratorUserIds.map(String)
      : undefined,
  });

  if (result.error && !result.postId) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    postId: result.postId,
    ...(result.error ? { warning: result.error } : {}),
  });
}
