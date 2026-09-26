import { apiRequest } from "@/api/client";
import { MobileApi } from "@/api/paths";

export type NotificationItem = {
  id: string;
  type?: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
  actor?: {
    id: string;
    username: string | null;
    image: string | null;
  } | null;
};

export async function fetchNotifications() {
  return apiRequest<{
    notifications: NotificationItem[];
    unread: number;
  }>(MobileApi.notifications, { auth: true });
}

export async function markNotificationsRead(input: { id?: string; all?: boolean }) {
  return apiRequest<{ ok: boolean; unread: number }>(MobileApi.notifications, {
    method: "POST",
    auth: true,
    body: input,
  });
}
