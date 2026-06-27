"use server";

import { Prisma } from "@prisma/client";
import { canVisitAptHome, resolveAptHomeOwnerId } from "@/actions/apt-cohabitation";
import { getCachedCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseStickerInstances } from "@/lib/diorama/sticker-instance-parse";
import type { StickerInstance } from "@/lib/diorama/sticker-types";

export type AptDioramaLayoutResult = {
  instances: StickerInstance[];
  canEdit: boolean;
  hasLayout: boolean;
  error?: string;
};

/** 방 주인 또는 방문 권한이 있는 사용자만 조회 */
export async function getAptDioramaLayout(
  hostUserId: string,
  roomId: string
): Promise<AptDioramaLayoutResult> {
  const viewer = await getCachedCurrentUser();
  if (!viewer) {
    return { instances: [], canEdit: false, hasLayout: false, error: "로그인이 필요합니다." };
  }

  const canAccess =
    hostUserId === viewer.id || (await canVisitAptHome(hostUserId, viewer.id));
  if (!canAccess) {
    return { instances: [], canEdit: false, hasLayout: false, error: "이 집을 방문할 수 없습니다." };
  }

  const ownerId = await resolveAptHomeOwnerId(hostUserId);
  const row = await db.aptDioramaLayout.findUnique({
    where: { userId_roomId: { userId: ownerId, roomId } },
  });

  const canEdit = viewer.id === ownerId;

  return {
    instances: row ? (parseStickerInstances(row.instances) ?? []) : [],
    canEdit,
    hasLayout: !!row,
  };
}

/** 집 주인만 저장 */
export async function saveAptDioramaLayout(roomId: string, instances: StickerInstance[]) {
  const user = await getCachedCurrentUser();
  if (!user) return { error: "로그인이 필요합니다." as const };

  const ownerId = await resolveAptHomeOwnerId(user.id);
  const json = instances as unknown as Prisma.InputJsonValue;

  await db.aptDioramaLayout.upsert({
    where: { userId_roomId: { userId: ownerId, roomId } },
    create: { userId: ownerId, roomId, instances: json },
    update: { instances: json },
  });

  return { ok: true as const };
}
