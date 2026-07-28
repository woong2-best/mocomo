import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-community-list", 60);
  if (limited) return limited;

  await getMobileUserId(req);
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "40") || 40, 80);

  const communities = await db.community.findMany({
    where: {
      isPublic: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { slug: { contains: q, mode: "insensitive" } },
              { description: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take,
    orderBy: [{ memberCount: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      iconUrl: true,
      bannerUrl: true,
      category: true,
      isNsfw: true,
      memberCount: true,
      joinMode: true,
    },
  });

  return NextResponse.json({
    items: communities.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      iconUrl: c.iconUrl,
      bannerUrl: c.bannerUrl,
      category: c.category,
      isNsfw: c.isNsfw,
      memberCount: c.memberCount,
      joinMode: c.joinMode,
    })),
  });
}
