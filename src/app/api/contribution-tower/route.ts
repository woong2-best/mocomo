import { type NextRequest, NextResponse } from "next/server";
import { listContributionTowerBlocks } from "@/lib/contribution-tower/service";
import { rateLimitPublicApi } from "@/lib/api-security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "contribution-tower", 120);
  if (limited) return limited;

  const url = new URL(req.url);
  const afterRaw = url.searchParams.get("afterStackOrder");
  const beforeRaw = url.searchParams.get("beforeStackOrder");
  const afterStackOrder = afterRaw != null && afterRaw !== "" ? Number(afterRaw) : undefined;
  const beforeStackOrder = beforeRaw != null && beforeRaw !== "" ? Number(beforeRaw) : undefined;
  if (afterStackOrder != null && !Number.isFinite(afterStackOrder)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }
  if (beforeStackOrder != null && !Number.isFinite(beforeStackOrder)) {
    return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
  }

  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw != null ? Number(limitRaw) : undefined;

  const data = await listContributionTowerBlocks({
    afterStackOrder: Number.isFinite(afterStackOrder) ? afterStackOrder : undefined,
    beforeStackOrder: Number.isFinite(beforeStackOrder) ? beforeStackOrder : undefined,
    limit,
  });

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
