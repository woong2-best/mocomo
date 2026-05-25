import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfileTimeline } from "@/actions/profile-page";
import { parseProfileTab } from "@/lib/profile-queries";

function serializePost(post: { createdAt: Date; [key: string]: unknown }) {
  return { ...post, createdAt: post.createdAt.toISOString() };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  const tab = parseProfileTab(req.nextUrl.searchParams.get("tab"));
  const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;

  const user = await db.user.findUnique({
    where: { username },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (tab === "likes") {
    const session = await auth();
    if (!session?.user?.id || session.user.id !== user.id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }

  const { items, nextCursor } = await getProfileTimeline(user.id, tab, cursor);

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

  return NextResponse.json({ items: serialized, nextCursor });
}
