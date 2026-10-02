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
    return NextResponse.json({ error: "Sign-in required." }, { status: 401 });
  }

  const { token } = await params;
  const row = await db.marketplaceDigitalDownload.findUnique({
    where: { downloadToken: token },
  });
  if (!row || row.buyerId !== session.user.id) {
    return NextResponse.json({ error: "You don't have permission to do that." }, { status: 403 });
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "The download period has expired." }, { status: 410 });
  }
  if (row.downloadCount >= row.maxDownloads) {
    return NextResponse.json({ error: "Download limit exceeded." }, { status: 429 });
  }

  await db.marketplaceDigitalDownload.update({
    where: { id: row.id },
    data: { downloadCount: { increment: 1 } },
  });

  return NextResponse.redirect(row.fileUrl);
}
