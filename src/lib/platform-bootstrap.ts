import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const PLATFORM_EMAIL = "platform@mocomo.app";
const PLATFORM_USERNAME = "mocomo_official";

const globalBootstrap = globalThis as unknown as { mocomoBootstrapped?: boolean };

export async function ensurePlatformBootstrap(prisma: PrismaClient) {
  if (globalBootstrap.mocomoBootstrapped) return;
  const adCount = await prisma.adSlot.count();
  if (adCount === 0) {
    await prisma.adSlot.createMany({
      data: [
        {
          position: "feed",
          title: "MoCoMo Premium — 광고 없이 애니덕질",
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
  }

  if ((await prisma.event.count()) === 0) {
    await prisma.event.create({
      data: {
        title: "MoCoMo 오픈 기념 팬아트",
        description: "첫 게시물과 팬아트를 올려 보세요!",
        type: "fanart",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        prize: "프리미엄 1개월",
      },
    });
  }

  let platform = await prisma.user.findUnique({ where: { email: PLATFORM_EMAIL } });
  if (!platform) {
    const hash = await bcrypt.hash(randomUUID(), 12);
    platform = await prisma.user.create({
      data: {
        email: PLATFORM_EMAIL,
        username: PLATFORM_USERNAME,
        name: "MoCoMo",
        passwordHash: hash,
        role: "ADMIN",
        profile: { create: { bio: "MoCoMo 공식 계정" } },
      },
    });
  }

  const postCount = await prisma.post.count();
  if (postCount === 0) {
    let community = await prisma.community.findFirst({ where: { slug: "welcome" } });
    if (!community) {
      community = await prisma.community.create({
        data: {
          slug: "welcome",
          name: "MoCoMo 공식",
          description: "환영합니다!",
          category: "OTHER",
          creatorId: platform.id,
          memberCount: 1,
          members: { create: { userId: platform.id, role: "owner" } },
        },
      });
    }

    await prisma.post.create({
      data: {
        title: "MoCoMo에 오신 것을 환영합니다 🎉",
        content:
          "회원가입 후 글·사진·코스프레·굿즈·라이브를 시작해 보세요!\n\n• /auth/signup — 가입\n• /live — 라이브\n• /cosplay — 코스프레\n• /market — 굿즈",
        authorId: platform.id,
        communityId: community.id,
        postType: "NEWS",
        hotScore: 100,
      },
    });
  }

  globalBootstrap.mocomoBootstrapped = true;
}
