import { db } from "@/lib/db";

/** Current username for a handle, including retired names from UsernameChangeLog. */
export async function resolveCurrentUsername(username: string): Promise<string | null> {
  const handle = username.trim().replace(/^@+/, "");
  if (!handle) return null;

  const current = await db.user.findFirst({
    where: { username: { equals: handle, mode: "insensitive" }, deletedAt: null },
    select: { username: true },
  });
  if (current) return current.username;

  const log = await db.usernameChangeLog.findFirst({
    where: { oldUsername: { equals: handle, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
    select: { userId: true },
  });
  if (!log) return null;

  const renamed = await db.user.findFirst({
    where: { id: log.userId, deletedAt: null },
    select: { username: true },
  });
  return renamed?.username ?? null;
}
