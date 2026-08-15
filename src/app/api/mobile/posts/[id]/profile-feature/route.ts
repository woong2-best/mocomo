import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { rateLimitPublicApi } from "@/lib/api-security";
import { db } from "@/lib/db";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { COMMUNITY_FEED_PATH } from "@/lib/site-routes";

function revalidateProfile(username: string, postId: string) {
  revalidatePath(`/u/${username}`);
  revalidatePath(`/post/${postId}`);
  revalidatePath(COMMUNITY_FEED_PATH);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-post-profile-feature", 30);
  if (limited) return limited;

  const { id: postId } = await params;
  if (!postId || postId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const me = await db.user.findUnique({
    where: { id: auth.user.id },
    select: { username: true, profileMainPostId: true },
  });
  if (!me) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  if (me.profileMainPostId === postId) {
    await db.user.update({
      where: { id: auth.user.id },
      data: { profileMainPostId: null },
    });
    revalidateProfile(me.username, postId);
    return NextResponse.json({ featured: false });
  }

  const post = await db.post.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) {
    return NextResponse.json({ error: "게시물을 찾을 수 없습니다." }, { status: 404 });
  }

  if (post.authorId === auth.user.id) {
    await db.$transaction([
      db.post.updateMany({
        where: { authorId: auth.user.id, isPinned: true },
        data: { isPinned: false },
      }),
      db.post.update({
        where: { id: postId },
        data: { isPinned: true },
      }),
      db.user.update({
        where: { id: auth.user.id },
        data: { profileMainPostId: postId },
      }),
    ]);
  } else {
    await db.$transaction([
      db.post.updateMany({
        where: { authorId: auth.user.id, isPinned: true },
        data: { isPinned: false },
      }),
      db.user.update({
        where: { id: auth.user.id },
        data: { profileMainPostId: postId },
      }),
    ]);
  }

  revalidateProfile(me.username, postId);
  return NextResponse.json({ featured: true });
}
