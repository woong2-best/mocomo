import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { ensureEmoticonCatalog } from "@/lib/goods-shop";
import { ensureAnimeWikiCatalog } from "@/lib/anime-wiki-seeds";
import { ensureCosplayBoardSeed } from "@/lib/cosplay-board-seed";
import { deactivateDemoAdSlots, ensureSidebarAdSlot } from "@/lib/deactivate-demo-ads";
const PLATFORM_EMAIL = "platform@mocomo.app";
const PLATFORM_USERNAME = "mocomo_official";

const globalBootstrap = globalThis as unknown as { mocomoBootstrapped?: boolean };

export async function ensurePlatformBootstrap(prisma: PrismaClient) {
  if (globalBootstrap.mocomoBootstrapped) return;
  await deactivateDemoAdSlots(prisma);
  await ensureSidebarAdSlot(prisma);
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
        role: "USER",
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
          "회원가입 후 글·사진·코스프레·후원·라이브를 시작해 보세요!\n\n• /auth/signup — 가입\n• /live — 라이브\n• /cosplay — 코스프레\n• /support — 후원",
        authorId: platform.id,
        communityId: community.id,
        postType: "NEWS",
        hotScore: 100,
      },
    });
  }

  try {
    await ensureEmoticonCatalog(prisma);
  } catch {
    /* 테이블 없으면 market fallback UI 사용 */
  }

  await ensureAnimeWikiCatalog(prisma);
  await ensureCosplayBoardSeed(prisma);

  try {
    const { seedShopProducts } = await import("@/lib/apt/economy/shop-product-service");
    const { ensureEconomyConfig } = await import("@/lib/apt/economy/config-service");
    const { seedGoldShopOffers } = await import("@/lib/apt/economy/gold-shop-service");
    const { seedFleaEvent } = await import("@/lib/apt/economy/flea-service");
    await seedShopProducts();
    await ensureEconomyConfig();
    await seedGoldShopOffers();
    await seedFleaEvent();
  } catch {
    /* APT economy tables may not exist yet */
  }

  globalBootstrap.mocomoBootstrapped = true;
}
