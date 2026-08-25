import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { rateLimitPublicApi } from "@/lib/api-security";
import { userDisplayName } from "@/lib/user-public-select";

export type PostShareCardPayload = {
  id: string;
  title: string | null;
  content: string;
  createdAt: string;
  author: {
    username: string;
    name: string | null;
    image: string | null;
    displayName: string;
  };
  media: { url: string; type: string; posterUrl: string | null } | null;
  href: string;
};

/** Lightweight post snapshot for DM shared-post cards (auth required). */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = await rateLimitPublicApi(req, "post-share-card", 90);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!id || id.length > 40) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const post = await db.post.findFirst({
    where: {
      id,
      visibility: "PUBLIC",
    },
    select: {
      id: true,
      title: true,
      content: true,
      createdAt: true,
      isNsfw: true,
      author: {
        select: {
          username: true,
          name: true,
          image: true,
        },
      },
      media: {
        where: { priceKrw: 0 },
        take: 1,
        orderBy: { order: "asc" },
        select: { url: true, type: true, posterUrl: true },
      },
    },
  });

  if (!post) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const media = post.media[0]
    ? {
        url: post.media[0].url,
        type: post.media[0].type,
        posterUrl: post.media[0].posterUrl,
      }
    : null;

  const payload: PostShareCardPayload = {
    id: post.id,
    title: post.title,
    content: post.content.slice(0, 500),
    createdAt: post.createdAt.toISOString(),
    author: {
      username: post.author.username,
      name: post.author.name,
      image: post.author.image,
      displayName: userDisplayName(post.author),
    },
    media: post.isNsfw ? null : media,
    href: `/post/${post.id}`,
  };

  return NextResponse.json(
    { ok: true, post: payload },
    { headers: { "Cache-Control": "private, max-age=60" } }
  );
}
