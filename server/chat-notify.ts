import type { PrismaClient } from "@prisma/client";

/** Socket 서버 전용 — next/server 없이 DM 알림만 생성 */
export async function notifyChatMessageSocket(
  prisma: PrismaClient,
  params: {
    roomId: string;
    senderId: string;
    content: string | null;
    roomType: string;
    mentionUserIds?: string[];
  }
): Promise<void> {
  try {
    const members = await prisma.chatMember.findMany({
      where: { roomId: params.roomId, userId: { not: params.senderId } },
      select: { userId: true },
    });
    if (members.length === 0) return;

    const sender = await prisma.user.findUnique({
      where: { id: params.senderId },
      select: { username: true },
    });
    const label = sender?.username ? `@${sender.username}` : "새 메시지";
    const preview =
      (params.content ?? "").trim().slice(0, 80) || "미디어를 보냈습니다.";
    const link = `/messages/${params.roomId}`;
    const isDm = params.roomType === "DM";
    const type = isDm ? "dm" : "dm_group";

    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        actorId: params.senderId,
        type,
        title: isDm ? "쪽지" : "그룹 메시지",
        body: `${label}: ${preview}`,
        link,
      })),
    });

    for (const uid of params.mentionUserIds ?? []) {
      if (!uid || uid === params.senderId) continue;
      await prisma.notification.create({
        data: {
          userId: uid,
          actorId: params.senderId,
          type: "mention",
          title: "멘션",
          body: `${label}님이 메시지에서 언급했습니다.`,
          link,
        },
      });
    }
  } catch {
    /* 알림 테이블 미적용 등 — 채팅 전송은 계속 */
  }
}
