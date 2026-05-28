"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requireAuthMinimal } from "@/lib/auth";

export async function toggleStreamClipLike(clipId: string) {
  const user = await requireAuthMinimal();
  const existing = await db.streamClipLike.findUnique({
    where: { clipId_userId: { clipId, userId: user.id } },
  });
  if (existing) {
    await db.$transaction([
      db.streamClipLike.delete({ where: { id: existing.id } }),
      db.streamClip.update({
        where: { id: clipId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);
    revalidatePath("/live");
    return { liked: false };
  }
  await db.$transaction([
    db.streamClipLike.create({ data: { clipId, userId: user.id } }),
    db.streamClip.update({
      where: { id: clipId },
      data: { likeCount: { increment: 1 } },
    }),
  ]);
  revalidatePath("/live");
  return { liked: true };
}

export async function addStreamClipComment(clipId: string, content: string) {
  const user = await requireAuth();
  const text = content.trim().slice(0, 500);
  if (!text) return { error: "댓글을 입력해 주세요." };
  await db.streamClipComment.create({
    data: { clipId, userId: user.id, content: text },
  });
  revalidatePath("/live");
  return { success: true as const };
}

/** 스트리머·운영: 클립 URL 등록 (R2 업로드 UI 연동 전) */
export async function createStreamClip(data: {
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  channelId?: string;
  isVertical?: boolean;
  durationSec?: number;
}) {
  const user = await requireAuth();
  const title = data.title.trim().slice(0, 120);
  const videoUrl = data.videoUrl.trim();
  if (!title || !videoUrl) return { error: "제목과 영상 URL이 필요합니다." };

  const clip = await db.streamClip.create({
    data: {
      title,
      videoUrl,
      thumbnailUrl: data.thumbnailUrl?.trim() || null,
      channelId: data.channelId || null,
      authorId: user.id,
      isVertical: data.isVertical ?? false,
      durationSec: data.durationSec ?? 0,
    },
  });
  revalidatePath("/live");
  return { clip };
}
