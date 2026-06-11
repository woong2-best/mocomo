import { NextRequest, NextResponse } from "next/server";
import {
  extractYoutubeVideoId,
  normalizeYoutubeUrl,
  youtubeEmbedUrl,
} from "@/lib/video-donation";

type OEmbedResponse = {
  title?: string;
  thumbnail_url?: string;
};

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url") ?? "";
  const normalized = normalizeYoutubeUrl(raw);
  if (!normalized) {
    return NextResponse.json({ error: "YouTube URL만 지원합니다." }, { status: 400 });
  }

  const videoId = extractYoutubeVideoId(normalized);
  if (!videoId) {
    return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 400 });
  }

  let title: string | null = null;
  let thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  try {
    const oembed = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(normalized)}&format=json`,
      { next: { revalidate: 3600 } }
    );
    if (oembed.ok) {
      const data = (await oembed.json()) as OEmbedResponse;
      title = data.title?.trim() ?? null;
      if (data.thumbnail_url) thumbnailUrl = data.thumbnail_url;
    }
  } catch {
    /* oembed optional */
  }

  return NextResponse.json({
    ok: true,
    videoId,
    videoUrl: normalized,
    title,
    thumbnailUrl,
    embedUrl: youtubeEmbedUrl(videoId),
  });
}
