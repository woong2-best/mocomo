import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "post-view", 120);
  if (limited) return limited;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  try {
    await db.post.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 404 });
  }
}
