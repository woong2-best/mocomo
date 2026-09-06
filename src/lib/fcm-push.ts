import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { db } from "@/lib/db";
import { mobileDeepLinkFromPath } from "@/lib/mobile-deeplink";
import { POST_INTERACTION_CATEGORY } from "@/lib/post-push-enrich";

export type FcmPushPayload = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  deeplink?: string;
  tag?: string;
  type?: string;
  data?: Record<string, string>;
};

type PushToken = { id: string; token: string; platform: string };

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function parseServiceAccount(): ServiceAccountJson | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function legacyServerKey(): string | null {
  const key =
    process.env.FIREBASE_SERVER_KEY?.trim() ||
    process.env.FCM_SERVER_KEY?.trim();
  return key || null;
}

export function isFcmConfigured(): boolean {
  return !!parseServiceAccount() || !!legacyServerKey();
}

function isStaleTokenError(code: string | undefined): boolean {
  return (
    code === "messaging/registration-token-not-registered" ||
    code === "messaging/invalid-registration-token" ||
    code === "messaging/invalid-argument"
  );
}

function ensureFirebaseApp(): boolean {
  const serviceAccount = parseServiceAccount();
  if (!serviceAccount) return false;
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount as ServiceAccount),
    });
  }
  return true;
}

function isPostInteraction(payload: FcmPushPayload): boolean {
  return payload.data?.categoryId === POST_INTERACTION_CATEGORY;
}

function notificationBody(payload: FcmPushPayload): string {
  return payload.data?.preview?.trim() || payload.body;
}

/** FCM HTTP v1 (firebase-admin) — FIREBASE_SERVICE_ACCOUNT JSON env */
async function sendFcmV1(payload: FcmPushPayload, tokens: PushToken[]) {
  if (!ensureFirebaseApp()) return;
  const messaging = getMessaging();

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  const stale: string[] = [];
  const pushType = payload.type || "notification";
  const deeplink =
    payload.deeplink ||
    (payload.url ? mobileDeepLinkFromPath(payload.url) : "mocomo://activity");
  const isCall = pushType === "incoming_call";
  const postInteraction = isPostInteraction(payload);
  const channelId = isCall ? "calls" : pushType === "dm" ? "messages" : postInteraction ? "social" : "default";
  const imageUrl = payload.data?.imageUrl?.trim() || undefined;
  const subtitle = payload.data?.subtitle?.trim() || undefined;
  const displayBody = notificationBody(payload);

  const data: Record<string, string> = {
    type: pushType,
    url: payload.url || `${appUrl}/notifications`,
    deeplink,
    title: payload.title,
    body: displayBody,
    ...(payload.data ?? {}),
  };

  await Promise.all(
    tokens.map(async ({ id, token, platform }) => {
      try {
        const isAndroid = platform === "android";

        if (postInteraction && isAndroid) {
          // Data-only: Android background task presents local notification with PNG action buttons.
          await messaging.send({
            token,
            data: {
              ...data,
              categoryId: POST_INTERACTION_CATEGORY,
            },
            android: { priority: "high" },
          });
          return;
        }

        await messaging.send({
          token,
          notification: {
            title: payload.title,
            body: displayBody,
            imageUrl,
          },
          data,
          android: {
            priority: "high",
            notification: {
              channelId,
              tag: payload.tag || "mocomo",
              sound: isCall ? "default" : undefined,
              imageUrl,
            },
          },
          apns: {
            headers: isCall || postInteraction ? { "apns-priority": "10" } : undefined,
            payload: {
              aps: {
                alert: postInteraction
                  ? {
                      title: payload.title,
                      subtitle,
                      body: displayBody,
                    }
                  : undefined,
                sound: isCall ? "default" : undefined,
                category: postInteraction ? POST_INTERACTION_CATEGORY : undefined,
                mutableContent: postInteraction && imageUrl ? true : undefined,
                contentAvailable: true,
              },
            },
            fcmOptions: imageUrl ? { imageUrl } : undefined,
          },
        });
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e
            ? String((e as { code?: string }).code)
            : undefined;
        if (isStaleTokenError(code)) stale.push(id);
      }
    })
  );

  if (stale.length > 0) {
    await db.mobilePushToken.deleteMany({ where: { id: { in: stale } } }).catch(() => undefined);
  }
}

/** @deprecated Legacy HTTP API — FIREBASE_SERVER_KEY. Prefer FIREBASE_SERVICE_ACCOUNT. */
async function sendFcmLegacy(payload: FcmPushPayload, tokens: PushToken[]) {
  const serverKey = legacyServerKey();
  if (!serverKey) return;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  const stale: string[] = [];
  const pushType = payload.type || "notification";
  const deeplink =
    payload.deeplink ||
    (payload.url ? mobileDeepLinkFromPath(payload.url) : "mocomo://activity");
  const isCall = pushType === "incoming_call";
  const postInteraction = isPostInteraction(payload);
  const displayBody = notificationBody(payload);
  const imageUrl = payload.data?.imageUrl?.trim();

  await Promise.all(
    tokens.map(async ({ id, token, platform }) => {
      try {
        const isAndroid = platform === "android";
        const dataPayload = {
          type: pushType,
          url: payload.url || `${appUrl}/notifications`,
          deeplink,
          title: payload.title,
          body: displayBody,
          ...(payload.data ?? {}),
        };

        if (postInteraction && isAndroid) {
          const res = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              Authorization: `key=${serverKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: token,
              priority: "high",
              data: {
                ...dataPayload,
                categoryId: POST_INTERACTION_CATEGORY,
              },
            }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            if (text.includes("NotRegistered") || text.includes("InvalidRegistration")) {
              stale.push(id);
            }
          }
          return;
        }

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
              body: displayBody,
              icon: `${appUrl}/mocomo-logo.png`,
              click_action: payload.url || `${appUrl}/notifications`,
              tag: payload.tag || "mocomo",
              sound: isCall ? "default" : undefined,
              android_channel_id: isCall ? "calls" : pushType === "dm" ? "messages" : postInteraction ? "social" : "default",
              image: imageUrl || undefined,
            },
            data: dataPayload,
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

export async function sendFcmToUser(payload: FcmPushPayload): Promise<void> {
  if (!isFcmConfigured()) return;

  const tokens = await db.mobilePushToken.findMany({
    where: { userId: payload.userId },
    select: { id: true, token: true, platform: true },
  });
  if (tokens.length === 0) return;

  if (parseServiceAccount()) {
    await sendFcmV1(payload, tokens);
    return;
  }

  await sendFcmLegacy(payload, tokens);
}
