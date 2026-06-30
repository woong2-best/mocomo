import { sendFcmToUser, isFcmConfigured } from "@/lib/fcm-push";
import { isWebPushConfigured, sendUserWebPush } from "@/lib/web-push";

export type MobilePushInput = {
  userId: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  type?: string;
};

/** Web Push + FCM 동시 시도 (설정된 채널만) */
export async function deliverMobilePush(input: MobilePushInput): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (isWebPushConfigured()) {
    tasks.push(
      sendUserWebPush({
        userId: input.userId,
        title: input.title,
        body: input.body,
        url: input.url,
        tag: input.tag,
        type: input.type,
        urgency: input.type === "incoming_call" ? "high" : "normal",
      })
    );
  }

  if (isFcmConfigured()) {
    tasks.push(
      sendFcmToUser({
        userId: input.userId,
        title: input.title,
        body: input.body,
        url: input.url,
        tag: input.tag,
        type: input.type,
      })
    );
  }

  if (tasks.length === 0) return;
  await Promise.allSettled(tasks);
}

export function isAnyPushConfigured(): boolean {
  return isWebPushConfigured() || isFcmConfigured();
}
