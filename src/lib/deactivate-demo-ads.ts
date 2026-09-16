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

/**
 * 오른쪽 패널 — 데모 "진행 중인 이벤트" 폴백 제거.
 * Sponsored 헤더는 유지하고, 유료 스폰서 이미지가 있을 때만 본문을 표시한다.
 */
export async function ensureSidebarAdSlot(prisma: PrismaClient) {
  await prisma.adSlot.updateMany({
    where: {
      active: true,
      position: "right",
      OR: [
        { linkUrl: "/events" },
        { linkUrl: "/events/map" },
        { title: "진행 중인 이벤트" },
        { imageUrl: "/ads/events.svg" },
      ],
    },
    data: { active: false },
  });
}
