import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** 플랫폼 기본 광고·콘텐츠 (가짜 유저/결제 없음) */
async function bootstrapPlatform() {
  const adCount = await prisma.adSlot.count();
  if (adCount === 0) {
    await prisma.adSlot.createMany({
      data: [
        {
          position: "feed",
          title: "MoCoMo Premium — 광고 없이 덕질",
          imageUrl: "/ads/premium.svg",
          linkUrl: "/premium",
          sponsorName: "MoCoMo",
          ctaLabel: "프리미엄 보기",
          adCategory: "프리미엄",
          isFeedAd: true,
          active: true,
        },
        {
          position: "feed",
          title: "라이브 방송 시작하기",
          imageUrl: "/ads/live.svg",
          linkUrl: "/live",
          sponsorName: "MoCoMo Live",
          ctaLabel: "라이브 보기",
          adCategory: "라이브",
          isFeedAd: true,
          active: true,
        },
        {
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
      ],
    });
    console.log("   → 기본 광고 3건 생성");
  }

  const eventCount = await prisma.event.count();
  if (eventCount === 0) {
    await prisma.event.create({
      data: {
        title: "MoCoMo 오픈 기념 팬아트",
        description: "첫 게시물과 팬아트를 올려 보세요!",
        type: "fanart",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        prize: "프리미엄 1개월",
      },
    });
    console.log("   → 이벤트 1건 생성");
  }
}

async function main() {
  console.log("🌱 MoCoMo bootstrap...");
  await bootstrapPlatform();
  console.log("✅ 완료");
  console.log("   회원가입: /auth/signup");
  console.log("   관리자: 첫 가입 후 DB에서 role=ADMIN 설정");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
