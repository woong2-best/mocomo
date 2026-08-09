import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { createCommunityForUser } from "@/lib/community-mobile-mutate";
import { getCachedMobileCommunities } from "@/lib/mobile-public-lists";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-community-list", 60);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const take = Math.min(Number(req.nextUrl.searchParams.get("take") ?? "80") || 80, 200);

  const communities = await getCachedMobileCommunities(take, q);

  return NextResponse.json(
    {
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
    },
    {
      headers: {
        "Cache-Control": q
          ? "private, no-cache"
          : "public, s-maxage=20, stale-while-revalidate=60",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-community-create", 10);
  if (limited) return limited;

  const userId = await getMobileUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { name?: string; description?: string; category?: string; isNsfw?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const result = await createCommunityForUser(userId, {
    name: body.name ?? "",
    description: body.description,
    category: body.category ?? "",
    isNsfw: body.isNsfw,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ community: result.community }, { status: 201 });
}
