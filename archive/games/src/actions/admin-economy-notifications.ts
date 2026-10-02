"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import {
  broadcastEconomyNotice,
  sendEconomyNoticeToUser,
} from "@/lib/apt/economy/notification/admin-economy-notifications-service";

const PATH = "/admin/economy/notifications";

function revalidate() {
  revalidatePath(PATH);
}

export async function adminBroadcastEconomyNotice(input: {
  title: string;
  body: string;
  href?: string;
  target: "all" | "economy_users";
}) {
  await requireAdmin();
  const res = await broadcastEconomyNotice(input);
  revalidate();
  return res;
}

export async function adminSendEconomyNoticeToUser(input: {
  username: string;
  title: string;
  body: string;
  href?: string;
}) {
  await requireAdmin();
  const res = await sendEconomyNoticeToUser(input);
  revalidate();
  return res;
}
