import { db } from "@/lib/db";

export type FcmPushPayload = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
};

function fcmServerKey(): string | null {
  const key =
    process.env.FIREBASE_SERVER_KEY?.trim() ||
    process.env.FCM_SERVER_KEY?.trim();
  return key || null;
}

export function isFcmConfigured(): boolean {
  return !!fcmServerKey();
}

/** FCM legacy HTTP API — FIREBASE_SERVER_KEY 또는 FCM_SERVER_KEY 필요 */
export async function sendFcmToUser(payload: FcmPushPayload): Promise<void> {
  const serverKey = fcmServerKey();
  if (!serverKey) return;

  const tokens = await db.mobilePushToken.findMany({
    where: { userId: payload.userId },
    select: { id: true, token: true },
  });
  if (tokens.length === 0) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  const stale: string[] = [];

  await Promise.all(
    tokens.map(async ({ id, token }) => {
      try {
        const res = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            Authorization: `key=${serverKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: token,
            priority: "high",
            notification: {
              title: payload.title,
              body: payload.body,
              icon: `${appUrl}/mocomo-logo.png`,
              click_action: payload.url || `${appUrl}/notifications`,
              tag: payload.tag || "mocomo",
            },
            data: {
              type: payload.type || "notification",
              url: payload.url || `${appUrl}/notifications`,
            },
          }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (text.includes("NotRegistered") || text.includes("InvalidRegistration")) {
            stale.push(id);
          }
        }
      } catch {
        /* ignore per-device failure */
      }
    })
  );

  if (stale.length > 0) {
    await db.mobilePushToken.deleteMany({ where: { id: { in: stale } } }).catch(() => undefined);
  }
}
