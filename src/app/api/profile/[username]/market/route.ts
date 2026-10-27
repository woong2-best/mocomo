import { NextRequest, NextResponse } from "next/server";
import { getProfileAuthorByUsername, getProfileMarketGrid } from "@/actions/profile-page";
import { parseProfileMarketTrack } from "@/lib/profile-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const track = parseProfileMarketTrack(req.nextUrl.searchParams.get("kind"));
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const author = await getProfileAuthorByUsername(username);
  if (!author) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const result = await getProfileMarketGrid(author.id, cursor, { track });

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, no-cache" },
  });
}
