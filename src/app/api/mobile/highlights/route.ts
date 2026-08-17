import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getCachedWeeklyHighlights } from "@/lib/cached-data";
import type { WeeklyHighlightPost } from "@/lib/weekly-highlights";

function mapHighlight(p: WeeklyHighlightPost) {
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
