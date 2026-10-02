import type { PrismaClient } from "@prisma/client";

const PLATFORM_EMAIL = "platform@mocomo.app";

type SeedPost = {
  mode: "RENTAL" | "PURCHASE";
  title: string;
  content: string;
  priceLabel: string;
  price?: number;
  region?: string;
  workTitle?: string;
  character?: string;
  sizeLabel?: string;
  isNotice?: boolean;
};

const SEED_POSTS: SeedPost[] = [
  {
    mode: "RENTAL",
    title: "[Rent] Blue Archive Arisa full set (wig, gun, shoes included)",
    content:
      "Size M full set for rent: wig, gun, shoes, gloves.\\n\\n· 25,000 KRW/day · 60,000 KRW/3 days\\n· 50,000 KRW deposit (refunded after return)\\n· Meet-up: Gangnam Station Exit 2\\n· Cleaned and repaired",
    price: 25000,
    priceLabel: "25,000 KRW/day",
    region: "Gangnam, Seoul",
    workTitle: "Blue Archive",
    character: "Arisa",
    sizeLabel: "M",
    isNotice: true,
  },
  {
    mode: "RENTAL",
    title: "Genshin Nahida full set for rent (wig included)",
    content:
      "Nahida full set for rent, wig included, size S–M.\\n\\n· 30,000 KRW/day\\n· Shipping available (return shipping extra)\\n· Before/after wear photos required",
    price: 30000,
    priceLabel: "30,000 KRW/day",
    region: "Suwon, Gyeonggi",
    workTitle: "Genshin Impact",
    character: "Nahida",
    sizeLabel: "S~M",
  },
  {
    mode: "RENTAL",
    title: "Chainsaw Man Reze outfit + wig for rent",
    content: "Reze cosplay outfit + wig for rent. Free size.\\n\\n· 18,000 KRW/day\\n· Meet-up: Seomyeon, Busan",
    price: 18000,
    priceLabel: "18,000 KRW/day",
    region: "Seomyeon, Busan",
    workTitle: "Chainsaw Man",
    character: "Reze",
    sizeLabel: "Free",
  },
  {
    mode: "PURCHASE",
    title: "[Sale] Genshin Raiden Shogun outfit size M (worn once)",
    content:
      "Raiden Shogun outfit size M for sale.\\n\\n· Worn once, cleaned\\n· Wig not included\\n· 85,000 KRW (negotiable)",
    price: 85000,
    priceLabel: "85,000 KRW",
    region: "Seoul",
    workTitle: "Genshin Impact",
    character: "Raiden Shogun",
    sizeLabel: "M",
    isNotice: true,
  },
  {
    mode: "PURCHASE",
    title: "Chainsaw Man Power wig + outfit set for sale",
    content: "Power full set (outfit + wig) for sale.\\n\\n· 55,000 KRW\\n· Free size\\n· Condition: A",
    price: 55000,
    priceLabel: "55,000 KRW",
    region: "Gyeonggi",
    workTitle: "Chainsaw Man",
    character: "Power",
    sizeLabel: "Free",
  },
  {
    mode: "PURCHASE",
    title: "[Quick sale] Magical-girl cosplay outfits bundle (3)",
    content:
      "Bundle of 3 magical-girl outfits.\\n\\n· 120,000 KRW (not sold separately)\\n· Size S–M\\n· Wigs not included",
    price: 120000,
    priceLabel: "120,000 KRW",
    region: "Seoul",
    sizeLabel: "S~M",
  },
];

export async function ensureCosplayBoardSeed(prisma: PrismaClient) {
  try {
    const count = await prisma.cosplayBoardPost.count();
    if (count > 0) return;

    const platform = await prisma.user.findUnique({
      where: { email: PLATFORM_EMAIL },
      select: { id: true },
    });
    if (!platform) return;

    await prisma.cosplayBoardPost.createMany({
      data: SEED_POSTS.map((p) => ({
        authorId: platform.id,
        mode: p.mode,
        title: p.title,
        content: p.content,
        price: p.price ?? null,
        priceLabel: p.priceLabel,
        region: p.region ?? null,
        workTitle: p.workTitle ?? null,
        character: p.character ?? null,
        sizeLabel: p.sizeLabel ?? null,
        isNotice: p.isNotice ?? false,
        images: [],
      })),
    });
  } catch {
    // table may not exist yet on first deploy
  }
}
