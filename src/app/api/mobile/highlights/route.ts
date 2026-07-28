import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getCachedWeeklyHighlights } from "@/lib/cached-data";

function mapHighlight(p: {
  id: string;
  title: string | null;
  content: string;
  viewCount: number;
  weeklyLikes: number;
  author: { username: string; name: string | null };
  media: { url: string }[];
  _count: { comments: number };
}) {
  return {
    id: p.id,
    title: p.title,
    content: p.content,
    viewCount: p.viewCount,
    weeklyLikes: p.weeklyLikes,
    commentCount: p._count.comments,
    hasMedia: p.media.length > 0,
    author: {
      username: p.author.username,
      name: p.author.name,
    },
  };
}

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-highlights", 60);
  if (limited) return limited;
  await getMobileUserId(req);

  try {
    const { topLiked, topViewed } = await getCachedWeeklyHighlights();
    return NextResponse.json({
      topLiked: topLiked.slice(0, 3).map(mapHighlight),
      topViewed: topViewed.slice(0, 3).map(mapHighlight),
    });
  } catch (e) {
    console.error("[api/mobile/highlights]", e);
    return NextResponse.json({ topLiked: [], topViewed: [] }, { status: 200 });
  }
}
