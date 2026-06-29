import { db } from "@/lib/db";
import { notifyAdminNotice } from "./economy-notify";

export async function broadcastEconomyNotice(input: {
  title: string;
  body: string;
  href?: string;
  target: "all" | "economy_users";
}): Promise<{ sent: number }> {
  let userIds: string[] = [];

  if (input.target === "all") {
    const users = await db.user.findMany({
      select: { id: true },
      take: 5000,
    });
    userIds = users.map((u) => u.id);
  } else {
    const wallets = await db.aptWallet.findMany({
      select: { userId: true },
      take: 5000,
    });
    userIds = wallets.map((w) => w.userId);
  }

  if (!userIds.length) return { sent: 0 };

  const chunkSize = 200;
  for (let i = 0; i < userIds.length; i += chunkSize) {
    const chunk = userIds.slice(i, i + chunkSize);
    await notifyAdminNotice({
      userIds: chunk,
      title: input.title,
      body: input.body,
      href: input.href,
    });
  }

  return { sent: userIds.length };
}

export async function sendEconomyNoticeToUser(input: {
  username: string;
  title: string;
  body: string;
  href?: string;
}): Promise<{ ok: true } | { error: string }> {
  const user = await db.user.findFirst({
    where: { username: { equals: input.username.trim(), mode: "insensitive" } },
    select: { id: true },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." };
  notifyAdminNotice({
    userIds: [user.id],
    title: input.title,
    body: input.body,
    href: input.href,
  });
  return { ok: true };
}
