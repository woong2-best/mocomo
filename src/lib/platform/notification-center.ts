import { db } from "@/lib/db";
import {
  createNotification,
  createNotificationsMany,
  type NotificationInput,
} from "@/lib/notifications";
import { emitPlatformEvent } from "@/lib/platform/event-bus";

export type NotifyChannel = "IN_APP" | "EMAIL" | "PUSH" | "WEBHOOK";

export type NotifyRequest = NotificationInput & {
  channels?: NotifyChannel[];
  emailTo?: string;
  webhookUrl?: string;
  category?: string;
};

/**
 * Notification Center — 쿠폰/Promotion/정산/라이브/신고 등 공통 진입점.
 * IN_APP은 즉시 DB 기록. EMAIL/PUSH/WEBHOOK은 Delivery 큐에 적재.
 */
export async function notify(req: NotifyRequest) {
  const channels = req.channels?.length ? req.channels : (["IN_APP"] as NotifyChannel[]);
  let notificationId: string | undefined;

  if (channels.includes("IN_APP")) {
    await createNotification({
      userId: req.userId,
      type: req.type,
      title: req.title,
      body: req.body,
      link: req.link,
      actorId: req.actorId,
    });
    const latest = await db.notification.findFirst({
      where: { userId: req.userId, title: req.title },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    notificationId = latest?.id;
  }

  for (const channel of channels) {
    if (channel === "IN_APP") continue;
    await db.notificationDelivery.create({
      data: {
        notificationId: notificationId ?? null,
        userId: req.userId,
        channel,
        status: "PENDING",
        payload: {
          title: req.title,
          body: req.body,
          link: req.link,
          type: req.type,
          emailTo: req.emailTo,
          webhookUrl: req.webhookUrl,
          category: req.category,
        },
      },
    });
  }

  return { notificationId };
}

export async function notifyMany(
  items: NotifyRequest[],
  defaultChannels: NotifyChannel[] = ["IN_APP"]
) {
  const inApp = items.filter((i) => (i.channels ?? defaultChannels).includes("IN_APP"));
  if (inApp.length) await createNotificationsMany(inApp);
  for (const item of items) {
    const channels = item.channels ?? defaultChannels;
    for (const channel of channels) {
      if (channel === "IN_APP") continue;
      await db.notificationDelivery.create({
        data: {
          userId: item.userId,
          channel,
          status: "PENDING",
          payload: {
            title: item.title,
            body: item.body,
            link: item.link,
            type: item.type,
          },
        },
      });
    }
  }
}

/** 관리자 전원(또는 역할)에게 알림 */
export async function notifyAdmins(input: {
  title: string;
  body?: string;
  link?: string;
  type?: string;
  roles?: string[];
  channels?: NotifyChannel[];
}) {
  const roles = input.roles ?? ["ADMIN", "SUPER_ADMIN", "OWNER", "MARKETING", "SETTLEMENT_MANAGER"];
  const admins = await db.user.findMany({
    where: {
      role: { in: roles as never[] },
      adminDisabledAt: null,
      deletedAt: null,
    },
    select: { id: true },
    take: 100,
  });
  await notifyMany(
    admins.map((a) => ({
      userId: a.id,
      type: input.type ?? "ADMIN",
      title: input.title,
      body: input.body,
      link: input.link,
      channels: input.channels ?? ["IN_APP"],
    }))
  );
  await emitPlatformEvent("AdminNotified", {
    title: input.title,
    count: admins.length,
  });
  return { count: admins.length };
}

/** PENDING Delivery 처리 스텁 (EMAIL/PUSH/WEBHOOK) */
export async function processPendingDeliveries(limit = 50) {
  const rows = await db.notificationDelivery.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  let processed = 0;
  for (const row of rows) {
    try {
      // EMAIL/PUSH/WEBHOOK 실제 발송은 프로바이더 연동 후 확장
      await db.notificationDelivery.update({
        where: { id: row.id },
        data: { status: "QUEUED", sentAt: new Date() },
      });
      processed += 1;
    } catch (e) {
      await db.notificationDelivery.update({
        where: { id: row.id },
        data: {
          status: "FAILED",
          error: e instanceof Error ? e.message : "error",
        },
      });
    }
  }
  return { processed };
}
