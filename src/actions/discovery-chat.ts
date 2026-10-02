import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { db } from "@/lib/db";
import { requireAuthMinimal } from "@/lib/auth";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import { orderedPair } from "@/lib/discovery/matching";

/** 매칭된 상대와 DM — 코스플레이어 후원 티어 제한 우회 */
export async function getOrCreateDiscoveryDM(otherUserId: string) {
  const user = await requireAuthMinimal();
  const [a, b] = orderedPair(user.id, otherUserId);
  const match = await db.discoveryMatch.findUnique({
    where: { userAId_userBId: { userAId: a, userBId: b } },
  });
  if (!match) return { error: t("actions.s13n7bnp") };

  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: user.id } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
    },
  });
  if (existing) return { room: existing, roomId: existing.id };

  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      isPublic: false,
      members: {
        create: [
          { userId: user.id, role: "owner" },
          { userId: otherUserId, role: "member" },
        ],
      },
    },
    include: {
      members: { include: { user: { select: { ...userPublicSelectMinimal, name: true } } } },
    },
  });
  return { room, roomId: room.id };
}
