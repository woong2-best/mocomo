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
    const label = sender?.username ? `@${sender.username}` : "New message";
    const preview =
      (params.content ?? "").trim().slice(0, 80) || "Sent media.";
    const link = `/messages/${params.roomId}`;
    const isDm = params.roomType === "DM";
    const type = isDm ? "dm" : "dm_group";

    await prisma.notification.createMany({
      data: members.map((m) => ({
        userId: m.userId,
        actorId: params.senderId,
        type,
        title: isDm ? "Direct message" : "Group message",
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
          title: "Mention",
          body: `${label} mentioned you in a message.`,
          link,
        },
      });
    }
  } catch {
    /* 알림 테이블 미적용 등 — 채팅 전송은 계속 */
  }
}
