import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = await rateLimitPublicApi(req, "market-download", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { token } = await params;
  const row = await db.marketplaceDigitalDownload.findUnique({
    where: { downloadToken: token },
  });
  if (!row || row.buyerId !== session.user.id) {
    return NextResponse.json({ error: "다운로드 권한이 없습니다." }, { status: 403 });
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "다운로드 기간이 만료되었습니다." }, { status: 410 });
  }
  if (row.downloadCount >= row.maxDownloads) {
    return NextResponse.json({ error: "다운로드 횟수를 초과했습니다." }, { status: 429 });
  }

  await db.marketplaceDigitalDownload.update({
    where: { id: row.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(row.fileUrl);
}
