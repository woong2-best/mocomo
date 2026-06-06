import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";
import { generateUsedListingDraft } from "@/lib/used-listing-ai";

export const runtime = "nodejs";

const HOURLY_LIMIT = 12;

async function checkAiRateLimit(userId: string): Promise<NextResponse | null> {
  const hourKey = new Date().toISOString().slice(0, 13);
  const identifier = `rate:used-ai:${userId}:${hourKey}`;
  const count = await db.verificationToken.count({
    where: { identifier, expires: { gt: new Date() } },
  });
  if (count >= HOURLY_LIMIT) {
    return NextResponse.json(
      { error: "AI 글쓰기는 시간당 12회까지 이용할 수 있습니다." },
      { status: 429 }
    );
  }
  await db.verificationToken.create({
    data: {
      identifier,
      token: `ai-${Date.now()}-${randomBytes(3).toString("hex")}`,
      expires: new Date(Date.now() + 3_700_000),
    },
  });
  return null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limited = await checkAiRateLimit(session.user.id);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as {
    images?: string[];
    category?: string;
    productType?: string;
    workTitle?: string;
    region?: string;
    saleType?: "FIXED" | "AUCTION";
    isFree?: boolean;
    partialTitle?: string;
    partialDescription?: string;
  };

  const result = await generateUsedListingDraft({
    images: Array.isArray(body.images) ? body.images : [],
    category: body.category,
    productType: body.productType,
    workTitle: body.workTitle,
    region: body.region,
    saleType: body.saleType === "AUCTION" ? "AUCTION" : "FIXED",
    isFree: !!body.isFree,
    partialTitle: body.partialTitle,
    partialDescription: body.partialDescription,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ draft: result.draft });
}
