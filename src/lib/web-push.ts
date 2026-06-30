import webpush from "web-push";
import { db } from "@/lib/db";

export function isWebPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
    process.env.VAPID_PRIVATE_KEY?.trim() &&
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim()
  );
}

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "mailto:support@mocomo.net";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export type IncomingCallPushPayload = {
  calleeId: string;
  callId: string;
  callerId: string;
  callerName: string;
  callType: "AUDIO" | "VIDEO";
  chatRoomId?: string | null;
};

export type UserPushPayload = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
  urgency?: "normal" | "high";
};

async function sendWebPushToUser(
  userId: string,
  body: string,
  options?: { urgency?: "normal" | "high"; topic?: string }
): Promise<void> {
  if (!configureWebPush()) return;

  const subs = await db.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return;

  const stale: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          {
            TTL: options?.urgency === "high" ? 45 : 3600,
            urgency: options?.urgency ?? "normal",
            topic: options?.topic,
          }
        );
      } catch (e: unknown) {
        const status = e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : 0;
        if (status === 404 || status === 410) {
          stale.push(sub.id);
        }
      }
    })
  );

  if (stale.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: stale } } }).catch(() => undefined);
  }
}

/** 범용 Web Push (APT·SNS 알림 등) */
export async function sendUserWebPush(payload: UserPushPayload): Promise<void> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  const body = JSON.stringify({
    type: payload.type || "notification",
    title: payload.title,
    body: payload.body,
    url: payload.url || `${appUrl}/notifications`,
    tag: payload.tag || `notify-${payload.userId}`,
    icon: `${appUrl}/mocomo-logo.png`,
    badge: `${appUrl}/mocomo-logo.png`,
  });
  await sendWebPushToUser(payload.userId, body, {
    urgency: payload.urgency,
    topic: payload.tag,
  });
}

export async function sendIncomingCallPush(payload: IncomingCallPushPayload): Promise<void> {
  if (!configureWebPush()) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  const kind = payload.callType === "VIDEO" ? "영상" : "음성";
  const openUrl = `${appUrl}/?incomingCall=${encodeURIComponent(payload.callId)}`;

  const body = JSON.stringify({
    type: "incoming_call",
    title: "수신 통화",
    body: `${payload.callerName}님의 ${kind} 통화`,
    callId: payload.callId,
    callType: payload.callType,
    url: openUrl,
    tag: `call-${payload.callId}`,
    icon: `${appUrl}/mocomo-logo.png`,
    badge: `${appUrl}/mocomo-logo.png`,
  });

  await sendWebPushToUser(payload.calleeId, body, {
    urgency: "high",
    topic: `call-${payload.callId}`,
  });
}
