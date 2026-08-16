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
};

export async function fetchNotifications() {
  return apiRequest<{
    notifications: NotificationItem[];
    unread: number;
  }>(MobileApi.notifications, { auth: true });
}
