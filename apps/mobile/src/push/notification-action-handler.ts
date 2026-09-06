import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";
import {
  POST_HEART_ACTION,
  POST_REPLY_ACTION,
  POST_STAR_ACTION,
} from "@/push/notification-categories";

type ActionPayload = {
  actionIdentifier: string;
  userText?: string;
  data: Record<string, unknown>;
};

function postIdFromData(data: Record<string, unknown>): string | null {
  return typeof data.postId === "string" && data.postId.length > 0 ? data.postId : null;
}

export async function handlePostNotificationAction(payload: ActionPayload): Promise<void> {
  const postId = postIdFromData(payload.data);
  if (!postId) return;

  const { actionIdentifier, userText } = payload;

  if (actionIdentifier === POST_REPLY_ACTION) {
    const text = userText?.trim();
    if (!text) return;
    await apiRequest(MobileApi.postComments(postId), {
      method: "POST",
      auth: true,
      body: { content: text },
    });
    return;
  }

  if (actionIdentifier === POST_STAR_ACTION) {
    await apiRequest(MobileApi.postStar(postId), { method: "POST", auth: true });
    return;
  }

  if (actionIdentifier === POST_HEART_ACTION) {
    await apiRequest(MobileApi.postLike(postId), { method: "POST", auth: true });
  }
}

export function isPostActionIdentifier(actionIdentifier: string): boolean {
  return (
    actionIdentifier === POST_REPLY_ACTION ||
    actionIdentifier === POST_STAR_ACTION ||
    actionIdentifier === POST_HEART_ACTION
  );
}

export function notificationDataFromResponse(response: {
  notification: { request: { content: { data?: Record<string, unknown> } } };
  actionIdentifier: string;
  userText?: string;
}): ActionPayload {
  return {
    actionIdentifier: response.actionIdentifier,
    userText: response.userText,
    data: (response.notification.request.content.data ?? {}) as Record<string, unknown>,
  };
}
