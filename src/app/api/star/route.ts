import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { getStarredPostsForUser } from "@/lib/star-bookmarks";

export async function GET() {
  const authResult = await requireApiUser();
  if ("error" in authResult) return authResult.error;

  try {
    const posts = await getStarredPostsForUser(authResult.user.id);
    return NextResponse.json({ posts });
  } catch (e) {
    console.error("[api/star]", e);
    return NextResponse.json({ error: "STAR 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}
