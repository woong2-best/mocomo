import { db } from "@/lib/db";
import { SPONSORED_AD_STATUS_ACTIVE, SPONSORED_AD_TARGET_EVENT } from "@/lib/sponsored-ad/constants";

const eventSelect = {
  id: true,
  title: true,
  imageUrl: true,
  linkUrl: true,
  startsAt: true,
  createdBy: { select: { name: true, username: true } },
} as const;

/** MOCO 스폰서드 + Stripe 등록비 이벤트를 광고 풀에 합침 */
export async function listEligibleSponsorEvents() {
  const now = new Date();

  const [activeMocoCampaigns, mocoTargetIds] = await Promise.all([
    db.sponsoredAdCampaign.findMany({
      where: {
        targetType: SPONSORED_AD_TARGET_EVENT,
        status: SPONSORED_AD_STATUS_ACTIVE,
        expiresAt: { gte: now },
      },
      select: { targetId: true },
      take: 60,
    }),
    db.sponsoredAdCampaign.findMany({
      where: { targetType: SPONSORED_AD_TARGET_EVENT },
      select: { targetId: true },
      distinct: ["targetId"],
    }),
  ]);

  const activeMocoIds = activeMocoCampaigns.map((c) => c.targetId);
  const allMocoPaidIds = mocoTargetIds.map((c) => c.targetId);

  const [mocoEvents, stripeEvents] = await Promise.all([
    activeMocoIds.length
      ? db.event.findMany({
          where: {
            id: { in: activeMocoIds },
            status: "PUBLISHED",
            createdById: { not: null },
            imageUrl: { not: null },
          },
          select: eventSelect,
          orderBy: { startsAt: "asc" },
        })
      : Promise.resolve([]),
    db.event.findMany({
      where: {
        endsAt: { gte: now },
        createdById: { not: null },
        registrationFeePaid: true,
        status: "PUBLISHED",
        imageUrl: { not: null },
        ...(allMocoPaidIds.length > 0 ? { id: { notIn: allMocoPaidIds } } : {}),
      },
      select: eventSelect,
      orderBy: { startsAt: "asc" },
      take: 60,
    }),
  ]);

  return [...mocoEvents, ...stripeEvents];
}

/** 모바일 배너용 — imageUrl만 필요 */
export async function listEligibleSponsorEventsForMobile() {
  const events = await listEligibleSponsorEvents();
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    imageUrl: e.imageUrl,
  }));
}
