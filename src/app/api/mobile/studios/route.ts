import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { listCreatorStudios } from "@/lib/creator-studio";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-studios", 60);
  if (limited) return limited;
  const q = req.nextUrl.searchParams.get("q")?.trim() || undefined;
  const items = await listCreatorStudios(q);
  return NextResponse.json({ items });
}
