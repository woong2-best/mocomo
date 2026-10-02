import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import type { CommunityChannelType } from "@prisma/client";

export type DefaultChannelSpec = {
  type: CommunityChannelType;
  name: string;
  slug: string;
  category: string;
  position: number;
  isDefault?: boolean;
  maxUsers?: number;
};

export const DEFAULT_SERVER_CHANNELS: DefaultChannelSpec[] = [
  { type: "POSTS", name: t("lib.flower.sq7xo0"), slug: "posts", category: t("lib.webtoon-studio.syyos"), position: 0, isDefault: true },
  { type: "TEXT", name: t("lib.flower.szwht"), slug: "chat", category: t("lib.webtoon-studio.syyos"), position: 1 },
  { type: "ANNOUNCEMENT", name: t("lib.community-server.suiy3"), slug: "announcements", category: t("lib.webtoon-studio.syyos"), position: 2 },
  { type: "QA", name: "Q&A", slug: "qa", category: t("lib.webtoon-studio.syyos"), position: 3 },
  { type: "GALLERY", name: t("lib.community-server.sq3zvo"), slug: "gallery", category: t("lib.webtoon-studio.syyos"), position: 4 },
  { type: "FILE", name: t("lib.community-server.s10zqo"), slug: "files", category: t("lib.webtoon-studio.syyos"), position: 5 },
  { type: "EVENT", name: t("lib.payment.history.sbff20dc3bb"), slug: "events", category: t("lib.payment.history.sbff20dc3bb"), position: 0 },
  { type: "MEMBERS", name: t("lib.community-server.swqlc"), slug: "members", category: t("lib.community-server.sz2in"), position: 0 },
  { type: "SETTINGS", name: t("settings.title"), slug: "settings", category: t("lib.community-server.sz2in"), position: 1 },
];

export const DEFAULT_SERVER_ROLES = [
  { type: "OWNER" as const, name: "Owner", color: "#f59e0b", position: 0 },
  { type: "ADMIN" as const, name: "Admin", color: "#ef4444", position: 1 },
  { type: "MODERATOR" as const, name: "Moderator", color: "#22c55e", position: 2 },
  { type: "VIP" as const, name: "VIP", color: "#a855f7", position: 3 },
  { type: "MEMBER" as const, name: "Member", color: "#94a3b8", position: 4, isDefault: true },
];
