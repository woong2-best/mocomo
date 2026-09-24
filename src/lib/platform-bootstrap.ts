import type { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { ensureEmoticonCatalog } from "@/lib/goods-shop";
import { ensureAnimeWikiCatalog } from "@/lib/anime-wiki-seeds";
import { ensureCosplayBoardSeed } from "@/lib/cosplay-board-seed";
import { deactivateDemoAdSlots, ensureSidebarAdSlot } from "@/lib/deactivate-demo-ads";
const PLATFORM_EMAIL = "platform@mocomo.app";
const PLATFORM_USERNAME = "mocomo_official";
const LEGACY_WELCOME_COMMUNITY_SLUG = "welcome";

const globalBootstrap = globalThis as unknown as { mocomoBootstrapped?: boolean };

/** 옛 bootstrap QnA 환영글(MoCoMo 공식) — 더 이상 노출하지 않음 */
async function removeLegacyWelcomeQnaSeed(prisma: PrismaClient) {
  const welcome = await prisma.community.findUnique({
    where: { slug: LEGACY_WELCOME_COMMUNITY_SLUG },
    select: { id: true },
  });
  if (!welcome) return;

  await prisma.post.deleteMany({ where: { communityId: welcome.id } });
  await prisma.community.delete({ where: { id: welcome.id } });
}

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

  const platform = await prisma.user.findUnique({ where: { email: PLATFORM_EMAIL } });
  if (!platform) {
    const hash = await bcrypt.hash(randomUUID(), 12);
    await prisma.user.create({
      data: {
        email: PLATFORM_EMAIL,
        username: PLATFORM_USERNAME,
        name: "MoCoMo",
        passwordHash: hash,
        role: "USER",
        profile: { create: { bio: "MoCoMo platform" } },
      },
    });
  }

  await removeLegacyWelcomeQnaSeed(prisma);

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
