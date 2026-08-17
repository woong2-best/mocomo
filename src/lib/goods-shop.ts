export const PLATFORM_FEE_RATE = 0.1;
export { LISTING_FEE_USD_CENTS as LISTING_FEE_KRW } from "@/lib/money";
export { EMOTICON_PRICES_USD_CENTS as EMOTICON_PRICES } from "@/lib/money";

export function calcShopFees(amount: number) {
  const platformFee = Math.floor(amount * PLATFORM_FEE_RATE);
  const creatorAmount = amount - platformFee;
  return { platformFee, creatorAmount };
}

/** 이미지는 나중에 URL만 넣으면 됨 — 지금은 비워 둠 */
export const EMOTICON_CATALOG_SEED = [
  { slug: "mocomo-smile-10k", name: "모코모 스마일", price: 999 },
  { slug: "mocomo-heart-10k", name: "모코모 하트", price: 999 },
  { slug: "mocomo-fire-20k", name: "모코모 불꽃", price: 1_999 },
  { slug: "mocomo-star-20k", name: "모코모 별", price: 1_999 },
  { slug: "mocomo-crown-30k", name: "모코모 크라운", price: 2_999 },
  { slug: "mocomo-rainbow-30k", name: "모코모 레인보우", price: 2_999 },
  { slug: "mocomo-galaxy-50k", name: "모코모 갤럭시", price: 4_999 },
  { slug: "mocomo-legend-50k", name: "모코모 레전드", price: 4_999 },
] as const;

export type EmoticonPackView = {
  id: string;
  slug: string;
  name: string;
  price: number;
  previewUrl: string | null;
  detailUrl: string | null;
  assetUrl: string | null;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
};

function fallbackPacks(): EmoticonPackView[] {
  return EMOTICON_CATALOG_SEED.map((p, i) => ({
    id: `fallback-${p.slug}`,
    slug: p.slug,
    name: p.name,
    price: p.price,
    previewUrl: null,
    detailUrl: null,
    assetUrl: null,
    sortOrder: i,
    active: true,
    createdAt: new Date(0),
  }));
}

export async function ensureEmoticonCatalog(db: {
  emoticonPack: {
    count: () => Promise<number>;
    createMany: (args: {
      data: {
        slug: string;
        name: string;
        price: number;
        previewUrl: string;
        detailUrl: string | null;
        assetUrl: string;
        sortOrder: number;
      }[];
      skipDuplicates?: boolean;
    }) => Promise<unknown>;
  };
}) {
  const count = await db.emoticonPack.count();
  if (count > 0) return;
  await db.emoticonPack.createMany({
    data: EMOTICON_CATALOG_SEED.map((p, i) => ({
      slug: p.slug,
      name: p.name,
      price: p.price,
      previewUrl: "",
      detailUrl: null,
      assetUrl: "",
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
}

export async function loadEmoticonPacks(db: {
  emoticonPack: {
    count: () => Promise<number>;
    createMany: (args: {
      data: {
        slug: string;
        name: string;
        price: number;
        previewUrl: string;
        detailUrl: string | null;
        assetUrl: string;
        sortOrder: number;
      }[];
      skipDuplicates?: boolean;
    }) => Promise<unknown>;
    findMany: (args: {
      where: { active: boolean };
      orderBy: ({ price: "asc" } | { sortOrder: "asc" })[];
    }) => Promise<EmoticonPackView[]>;
  };
}): Promise<{ packs: EmoticonPackView[]; dbReady: boolean }> {
  try {
    await ensureEmoticonCatalog(db);
    const packs = await db.emoticonPack.findMany({
      where: { active: true },
      orderBy: [{ price: "asc" }, { sortOrder: "asc" }],
    });
    return {
      packs: packs.map((p) => ({
        ...p,
        previewUrl: p.previewUrl?.trim() || null,
        assetUrl: p.assetUrl?.trim() || null,
        detailUrl: p.detailUrl?.trim() || null,
      })),
      dbReady: true,
    };
  } catch {
    return { packs: fallbackPacks(), dbReady: false };
  }
}
