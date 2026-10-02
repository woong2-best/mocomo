import { db } from "@/lib/db";
import type { AptShopProductDto, AptShopProductType } from "./wallet-types";

function toDto(row: {
  id: string;
  slug: string;
  productId: string;
  type: string;
  amount: number;
  bonusAmount: number;
  priceTier: number;
  title: string;
  description: string | null;
}): AptShopProductDto {
  return {
    id: row.id,
    slug: row.slug,
    productId: row.productId,
    type: row.type as AptShopProductType,
    amount: row.amount,
    bonusAmount: row.bonusAmount,
    priceTier: row.priceTier,
    title: row.title,
    description: row.description,
  };
}

export async function listEnabledShopProducts(): Promise<AptShopProductDto[]> {
  const rows = await db.aptShopProduct.findMany({
    where: { enabled: true },
    orderBy: [{ sortOrder: "asc" }, { amount: "asc" }],
  });
  return rows.map(toDto);
}

export async function findShopProductByProductId(
  productId: string
): Promise<AptShopProductDto | null> {
  const row = await db.aptShopProduct.findFirst({
    where: { productId, enabled: true },
  });
  return row ? toDto(row) : null;
}

export async function findShopProductBySlug(slug: string): Promise<AptShopProductDto | null> {
  const row = await db.aptShopProduct.findFirst({
    where: { slug, enabled: true },
  });
  return row ? toDto(row) : null;
}

export const DEFAULT_SHOP_PRODUCTS = [
  {
    slug: "gem_80",
    productId: "gem_80",
    type: "gems" as const,
    amount: 80,
    bonusAmount: 0,
    priceTier: 1,
    title: "젬 80개",
    description: "소량 젬 팩",
    sortOrder: 10,
  },
  {
    slug: "gem_500",
    productId: "gem_500",
    type: "gems" as const,
    amount: 500,
    bonusAmount: 50,
    priceTier: 2,
    title: "젬 500개",
    description: "보너스 +50",
    sortOrder: 20,
  },
  {
    slug: "gem_1200",
    productId: "gem_1200",
    type: "gems" as const,
    amount: 1200,
    bonusAmount: 200,
    priceTier: 3,
    title: "젬 1200개",
    description: "보너스 +200",
    sortOrder: 30,
  },
  {
    slug: "gold_1000",
    productId: "gold_1000",
    type: "gold" as const,
    amount: 1000,
    bonusAmount: 0,
    priceTier: 1,
    title: "골드 1000",
    description: "즉시 골드 지급",
    sortOrder: 40,
  },
  {
    slug: "starter_bundle",
    productId: "starter_bundle",
    type: "bundle" as const,
    amount: 300,
    bonusAmount: 5000,
    priceTier: 2,
    title: "스타터 번들",
    description: "젬 300 + 골드 5000",
    sortOrder: 50,
  },
] as const;

export async function seedShopProducts(): Promise<void> {
  for (const p of DEFAULT_SHOP_PRODUCTS) {
    await db.aptShopProduct.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        productId: p.productId,
        type: p.type,
        amount: p.amount,
        bonusAmount: p.bonusAmount,
        priceTier: p.priceTier,
        title: p.title,
        description: p.description,
        sortOrder: p.sortOrder,
        enabled: true,
      },
      update: {
        productId: p.productId,
        type: p.type,
        amount: p.amount,
        bonusAmount: p.bonusAmount,
        priceTier: p.priceTier,
        title: p.title,
        description: p.description,
        sortOrder: p.sortOrder,
        enabled: true,
      },
    });
  }
}
