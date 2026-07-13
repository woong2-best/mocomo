import { NextRequest, NextResponse } from "next/server";
import { getProfileAuthorByUsername, getProfileMediaGrid } from "@/actions/profile-page";
import { parseProfileMediaKind, parseProfileSort } from "@/lib/profile-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const sort = parseProfileSort(req.nextUrl.searchParams.get("sort"));
  const mediaKind = parseProfileMediaKind(req.nextUrl.searchParams.get("kind"));
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const author = await getProfileAuthorByUsername(username);
  if (!author) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { items, nextCursor } = await getProfileMediaGrid(author.id, author, cursor, {
    sort,
    mediaKind,
  });

  return NextResponse.json(
    { items, nextCursor },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } }
  );
}
