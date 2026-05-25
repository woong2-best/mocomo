export const PLATFORM_FEE_RATE = 0.1;
export const LISTING_FEE_KRW = 5000;
export const EMOTICON_PRICES = [10_000, 20_000, 30_000, 50_000] as const;

export function calcShopFees(amount: number) {
  const platformFee = Math.floor(amount * PLATFORM_FEE_RATE);
  const creatorAmount = amount - platformFee;
  return { platformFee, creatorAmount };
}

export const EMOTICON_CATALOG_SEED = [
  { slug: "mocomo-smile-10k", name: "모코모 스마일", price: 10_000, previewUrl: "/emoticons/mocomo-smile.svg", assetUrl: "/emoticons/mocomo-smile.svg" },
  { slug: "mocomo-heart-10k", name: "모코모 하트", price: 10_000, previewUrl: "/emoticons/mocomo-heart.svg", assetUrl: "/emoticons/mocomo-heart.svg" },
  { slug: "mocomo-fire-20k", name: "모코모 불꽃", price: 20_000, previewUrl: "/emoticons/mocomo-fire.svg", assetUrl: "/emoticons/mocomo-fire.svg" },
  { slug: "mocomo-star-20k", name: "모코모 별", price: 20_000, previewUrl: "/emoticons/mocomo-star.svg", assetUrl: "/emoticons/mocomo-star.svg" },
  { slug: "mocomo-crown-30k", name: "모코모 크라운", price: 30_000, previewUrl: "/emoticons/mocomo-crown.svg", assetUrl: "/emoticons/mocomo-crown.svg" },
  { slug: "mocomo-rainbow-30k", name: "모코모 레인보우", price: 30_000, previewUrl: "/emoticons/mocomo-rainbow.svg", assetUrl: "/emoticons/mocomo-rainbow.svg" },
  { slug: "mocomo-galaxy-50k", name: "모코모 갤럭시", price: 50_000, previewUrl: "/emoticons/mocomo-galaxy.svg", assetUrl: "/emoticons/mocomo-galaxy.svg" },
  { slug: "mocomo-legend-50k", name: "모코모 레전드", price: 50_000, previewUrl: "/emoticons/mocomo-legend.svg", assetUrl: "/emoticons/mocomo-legend.svg" },
] as const;

export async function ensureEmoticonCatalog(db: {
  emoticonPack: {
    count: () => Promise<number>;
    createMany: (args: { data: { slug: string; name: string; price: number; previewUrl: string; detailUrl: string | null; assetUrl: string; sortOrder: number }[]; skipDuplicates?: boolean }) => Promise<unknown>;
  };
}) {
  const count = await db.emoticonPack.count();
  if (count > 0) return;
  await db.emoticonPack.createMany({
    data: EMOTICON_CATALOG_SEED.map((p, i) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      previewUrl: p.previewUrl,
      detailUrl: null,
      assetUrl: p.assetUrl,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
}
