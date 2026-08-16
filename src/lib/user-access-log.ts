import { headers } from "next/headers";
import { db } from "@/lib/db";
import { parseUserAgent } from "@/lib/admin/security/ua-parse";

export type UserAccessChannel = "web" | "mobile";

export type RecordUserAccessLogInput = {
  userId?: string | null;
  username?: string | null;
  email?: string | null;
  success: boolean;
  failureReason?: string | null;
  channel?: UserAccessChannel;
  provider?: string | null;
  platform?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
};

async function readRequestContext(input: RecordUserAccessLogInput) {
  let ip = input.ip ?? null;
  let userAgent = input.userAgent ?? null;
  let country = input.country ?? null;
  let region = input.region ?? null;
  let city = input.city ?? null;

  try {
    const h = await headers();
    ip =
      ip ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    userAgent = userAgent ?? h.get("user-agent");
    country =
      country ??
      h.get("x-vercel-ip-country") ??
      h.get("cf-ipcountry") ??
      null;
    region = region ?? h.get("x-vercel-ip-country-region") ?? null;
    city = city ?? h.get("x-vercel-ip-city") ?? null;
  } catch {
    /* headers unavailable outside request scope */
  }

  return { ip, userAgent, country, region, city };
}

export async function recordUserAccessLog(input: RecordUserAccessLogInput): Promise<void> {
  try {
    const ctx = await readRequestContext(input);
    const parsed = parseUserAgent(ctx.userAgent);
    await db.userAccessLog.create({
      data: {
        userId: input.userId ?? null,
        username: input.username ?? null,
        email: input.email ?? null,
        ip: ctx.ip,
        country: ctx.country,
        region: ctx.region,
        city: ctx.city,
        userAgent: ctx.userAgent?.slice(0, 500) ?? null,
        browser: parsed.browser,
        os: parsed.os,
        device: parsed.device,
        channel: input.channel ?? "web",
        provider: input.provider ?? null,
        platform: input.platform ?? null,
        success: input.success,
        failureReason: input.failureReason ?? null,
      },
    });
  } catch (e) {
    console.error("[user-access-log] write failed", e);
  }
}

export async function listUserAccessLogs(opts?: {
  q?: string;
  userId?: string;
  ip?: string;
  success?: boolean;
  channel?: string;
  take?: number;
  page?: number;
}) {
  const take = Math.min(opts?.take ?? 50, 200);
  const page = Math.max(opts?.page ?? 1, 1);
  const skip = (page - 1) * take;
  const q = opts?.q?.trim();

  const where = {
    ...(opts?.userId ? { userId: opts.userId } : {}),
    ...(opts?.ip ? { ip: { contains: opts.ip } } : {}),
    ...(opts?.success !== undefined ? { success: opts.success } : {}),
    ...(opts?.channel ? { channel: opts.channel } : {}),
    ...(q
      ? {
          OR: [
            { username: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
            { ip: { contains: q } },
            { city: { contains: q, mode: "insensitive" as const } },
            { country: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.userAccessLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
      include: {
        user: { select: { id: true, username: true, email: true, role: true } },
      },
    }),
    db.userAccessLog.count({ where }),
  ]);

  return {
    rows,
    total,
    page,
    totalPages: Math.max(1, Math.ceil(total / take)),
  };
}
