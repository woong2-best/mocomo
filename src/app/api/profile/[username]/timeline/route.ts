import { NextRequest, NextResponse } from "next/server";
import { getCachedSession } from "@/lib/auth";
import { getProfileAuthorByUsername, getProfileTimeline } from "@/actions/profile-page";
import { parseProfileMediaKind, parseProfileSort, parseProfileTab } from "@/lib/profile-queries";

function serializePost(post: { createdAt: Date; [key: string]: unknown }) {
  return { ...post, createdAt: post.createdAt.toISOString() };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const tab = parseProfileTab(req.nextUrl.searchParams.get("tab"));
  const sort = parseProfileSort(req.nextUrl.searchParams.get("sort"));
  const mediaKind = parseProfileMediaKind(req.nextUrl.searchParams.get("kind"));
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const author = await getProfileAuthorByUsername(username);
  if (!author) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (tab === "likes") {
    const session = await getCachedSession();
    if (!session?.user?.id || session.user.id !== author.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { items, nextCursor } = await getProfileTimeline(author.id, tab, author, cursor, {
    sort,
    mediaKind: tab === "media" ? mediaKind ?? "photo" : null,
  });

  const serialized = items.map((item) => {
    if (item.type === "post") {
      return { type: "post" as const, post: serializePost(item.post) };
    }
    if (item.type === "reply") {
      return {
        type: "reply" as const,
        comment: { ...item.comment, createdAt: item.comment.createdAt.toISOString() },
        post: serializePost(item.post),
      };
    }
    return { type: "like" as const, post: serializePost(item.post) };
  });

  const cacheHeader =
    tab === "likes"
      ? "private, no-store"
      : "public, s-maxage=30, stale-while-revalidate=120";

  return NextResponse.json(
    { items: serialized, nextCursor },
    { headers: { "Cache-Control": cacheHeader } }
  );
}
