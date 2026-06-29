import { after } from "next/server";
import { db } from "@/lib/db";
import { isEconomyNotificationDeliveryEnabled } from "../economy-emergency";
import type {
  AptNotificationPayload,
  AptNotificationType,
} from "./apt-notification-types";

export type AptNotificationInput = {
  userId: string;
  type: AptNotificationType;
  title: string;
  body: string;
  payload?: AptNotificationPayload;
  correlationId?: string;
};

const RETENTION_DAYS = 30;

function retentionSince(): Date {
  return new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

/** In-app 채널 — Push/Email은 추후 동일 인터페이스로 확장 */
async function deliverInApp(input: AptNotificationInput): Promise<void> {
  await db.aptNotification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      payload: (input.payload ?? {}) as object,
      correlationId: input.correlationId,
    },
  });
}

/** @deprecated Push stub — Firebase/APNs 연동 시 구현 */
async function deliverPush(_input: AptNotificationInput): Promise<void> {
  /* Phase 11 */
}

export async function sendAptNotification(input: AptNotificationInput): Promise<void> {
  if (!(await isEconomyNotificationDeliveryEnabled())) return;
  await deliverInApp(input);
  void deliverPush(input);
}

export function scheduleAptNotification(input: AptNotificationInput): void {
  const deliver = () => {
    void sendAptNotification(input);
  };
  if (process.env.ECONOMY_SYNC_NOTIFY === "1") {
    deliver();
    return;
  }
  try {
    after(async () => {
      await sendAptNotification(input);
    });
  } catch {
    deliver();
  }
}

export async function sendAptNotificationsMany(inputs: AptNotificationInput[]): Promise<void> {
  if (!inputs.length) return;
  await db.aptNotification.createMany({
    data: inputs.map((n) => ({
      userId: n.userId,
      type: n.type,
      title: n.title,
      body: n.body,
      payload: (n.payload ?? {}) as object,
    })),
  });
}

export async function countAptUnread(userId: string): Promise<number> {
  return db.aptNotification.count({
    where: { userId, isRead: false, createdAt: { gte: retentionSince() } },
  });
}

export async function markAptNotificationRead(userId: string, id: string): Promise<void> {
  await db.aptNotification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
}

export async function markAllAptNotificationsRead(userId: string): Promise<void> {
  await db.aptNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteAllAptNotifications(userId: string): Promise<number> {
  const res = await db.aptNotification.deleteMany({ where: { userId } });
  return res.count;
}

export async function listAptNotifications(
  userId: string,
  options?: { types?: string[]; limit?: number; unreadOnly?: boolean }
) {
  return db.aptNotification.findMany({
    where: {
      userId,
      createdAt: { gte: retentionSince() },
      ...(options?.unreadOnly ? { isRead: false } : {}),
      ...(options?.types?.length ? { type: { in: options.types } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: options?.limit ?? 80,
  });
}

export { RETENTION_DAYS };
