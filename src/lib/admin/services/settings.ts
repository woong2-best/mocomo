import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { logSiteAdminAudit } from "@/lib/site-admin-audit";
import type { AdminActor } from "@/lib/admin/access";

export type SiteSettingsShape = {
  siteName: string;
  platformFeePercent: number;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  oauthGoogleEnabled: boolean;
  oauthDiscordEnabled: boolean;
  cloudflareTurnstileEnabled: boolean;
  storageProvider: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettingsShape = {
  siteName: "MoCoMo",
  platformFeePercent: 10,
  registrationEnabled: true,
  maintenanceMode: false,
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  oauthGoogleEnabled: true,
  oauthDiscordEnabled: true,
  cloudflareTurnstileEnabled: true,
  storageProvider: "supabase",
};

const SETTINGS_KEY = "site.global";

export async function getSiteSettings(): Promise<SiteSettingsShape> {
  const row = await db.siteSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || typeof row.value !== "object" || row.value === null) {
    return { ...DEFAULT_SITE_SETTINGS };
  }
  return { ...DEFAULT_SITE_SETTINGS, ...(row.value as Partial<SiteSettingsShape>) };
}

export async function updateSiteSettings(
  actor: AdminActor,
  patch: Partial<SiteSettingsShape>
) {
  const current = await getSiteSettings();
  const next: SiteSettingsShape = {
    ...current,
    ...patch,
    platformFeePercent: Math.min(
      50,
      Math.max(0, Number(patch.platformFeePercent ?? current.platformFeePercent) || 0)
    ),
    siteName: (patch.siteName ?? current.siteName).trim().slice(0, 80) || "MoCoMo",
  };

  await db.siteSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: {
      key: SETTINGS_KEY,
      value: next as unknown as Prisma.InputJsonValue,
      updatedBy: actor.id,
    },
    update: {
      value: next as unknown as Prisma.InputJsonValue,
      updatedBy: actor.id,
    },
  });

  await logSiteAdminAudit({
    actorId: actor.id,
    action: "SETTINGS_UPDATE",
    targetType: "site_setting",
    targetId: SETTINGS_KEY,
    metadata: { keys: Object.keys(patch) },
  });

  return next;
}

export async function listAuditLogs(input: {
  q?: string;
  action?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, input.pageSize ?? 30));
  const where: Prisma.SiteAdminAuditLogWhereInput = {};
  if (input.action?.trim()) where.action = input.action.trim();
  if (input.q?.trim()) {
    const q = input.q.trim();
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { targetId: { contains: q } },
      { targetType: { contains: q, mode: "insensitive" } },
      { actor: { username: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, items] = await Promise.all([
    db.siteAdminAuditLog.count({ where }),
    db.siteAdminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { username: true, id: true } } },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
