import type { PrismaClient } from "@prisma/client";

/** 피드·여백 레일 데모 광고만 비활성화 (오른쪽 Sponsored 패널은 유지) */
export async function deactivateDemoAdSlots(prisma: PrismaClient) {
  await prisma.adSlot.updateMany({
    where: {
      active: true,
      OR: [
        { isFeedAd: true },
        { position: "feed" },
        { position: { in: ["margin_left", "margin_right"] } },
      ],
    },
    data: { active: false },
  });
}

/** 오른쪽 패널 기본 광고 — 없으면 1건 시드 */
export async function ensureSidebarAdSlot(prisma: PrismaClient) {
  await prisma.adSlot.updateMany({
    where: { position: "right", linkUrl: "/events/map" },
    data: { linkUrl: "/events" },
  });

  const count = await prisma.adSlot.count({
    where: { active: true, position: "right" },
  });
  if (count > 0) return;

  await prisma.adSlot.create({
    data: {
      position: "right",
      title: "진행 중인 이벤트",
      imageUrl: "/ads/events.svg",
      linkUrl: "/events",
      sponsorName: "MoCoMo Events",
      ctaLabel: "참가하기",
      adCategory: "이벤트",
      isFeedAd: false,
      active: true,
    },
  });
}
