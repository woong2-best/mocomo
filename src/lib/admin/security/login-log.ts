import { headers } from "next/headers";
import { db } from "@/lib/db";
import { parseUserAgent } from "@/lib/admin/security/ua-parse";

export async function recordAdminLoginAttempt(input: {
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  success: boolean;
  failureReason?: string | null;
  usedPasskey?: boolean;
  usedTotp?: boolean;
  usedRecovery?: boolean;
  ip?: string | null;
  userAgent?: string | null;
  country?: string | null;
}) {
  let ip = input.ip ?? null;
  let userAgent = input.userAgent ?? null;
  try {
    const h = await headers();
    ip =
      ip ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = userAgent ?? h.get("user-agent");
    const country =
      input.country ??
      h.get("x-vercel-ip-country") ??
      h.get("cf-ipcountry") ??
      null;
    const parsed = parseUserAgent(userAgent);
    await db.adminLoginAttempt.create({
      data: {
        userId: input.userId ?? null,
        username: input.username ?? null,
        email: input.email ?? null,
        ip,
        country,
        userAgent: userAgent?.slice(0, 500) ?? null,
        browser: parsed.browser,
        os: parsed.os,
        device: parsed.device,
        usedPasskey: !!input.usedPasskey,
        usedTotp: !!input.usedTotp,
        usedRecovery: !!input.usedRecovery,
        success: input.success,
        failureReason: input.failureReason ?? null,
      },
    });
  } catch (e) {
    console.error("[admin-login-log] write failed", e);
  }
}

export async function listAdminLoginAttempts(opts?: {
  userId?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(opts?.take ?? 50, 200);
  return db.adminLoginAttempt.findMany({
    where: opts?.userId ? { userId: opts.userId } : undefined,
    orderBy: { createdAt: "desc" },
    take,
    ...(opts?.cursor
      ? { skip: 1, cursor: { id: opts.cursor } }
      : {}),
    include: {
      user: { select: { id: true, username: true, email: true, role: true } },
    },
  });
}
