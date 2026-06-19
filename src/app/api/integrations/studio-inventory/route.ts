import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";
import { grantStudioInventory } from "@/studio/lib/inventory";

function checkSecret(req: NextRequest) {
  const secret = req.headers.get("x-studio-integration-secret");
  const expected = process.env.STUDIO_INTEGRATION_SECRET;
  return expected && secret === expected;
}

/** MoCoMo APT 등에서 Published Studio 자산 목록 조회 (읽기 전용) */
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (userId) {
    if (!checkSecret(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const items = await db.studioUserInventory.findMany({
      where: { userId },
      orderBy: { acquiredAt: "desc" },
      include: {
        asset: {
          include: { catalogEntry: true },
        },
      },
    });
    return NextResponse.json({
      items: items
        .filter((i) => i.asset.status === "PUBLISHED")
        .map((i) => ({
          studioAssetId: i.studioAssetId,
          source: i.source,
          acquiredAt: i.acquiredAt,
          name: i.asset.name,
          category: i.asset.category,
          glbUrl: i.asset.glbUrl,
          thumbnailUrl: i.asset.thumbnailUrl,
        })),
    });
  }

  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? 50), 100);

  const items = await db.mocomoStudioCatalogItem.findMany({
    where: category ? { category } : undefined,
    orderBy: { publishedAt: "desc" },
    take,
  });

  return NextResponse.json({ items });
}

/** Studio → MoCoMo 인벤토리 등록 (서비스 간 연동 · API 키 필요) */
export async function POST(req: NextRequest) {
  if (!checkSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const studioAssetId = String(body.studioAssetId ?? "");
  if (!studioAssetId) {
    return NextResponse.json({ error: "studioAssetId required" }, { status: 400 });
  }

  const existing = await db.mocomoStudioCatalogItem.findUnique({
    where: { studioAssetId },
  });
  if (existing) {
    return NextResponse.json({ item: existing, created: false });
  }

  return NextResponse.json({ error: "Use Studio publish flow" }, { status: 400 });
}
