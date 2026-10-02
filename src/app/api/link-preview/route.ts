import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { buildLinkPreview, isSafePreviewUrl } from "@/lib/link-preview";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "link-preview", 60);
  if (limited) return limited;

  const raw = req.nextUrl.searchParams.get("url") ?? "";
  if (!raw.trim()) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  if (!isSafePreviewUrl(raw)) {
    return NextResponse.json({ error: "Unsupported URL." }, { status: 400 });
  }

  const preview = await buildLinkPreview(raw);
  if (!preview) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!preview.title && !preview.imageUrl && !preview.description) {
    return NextResponse.json(
      {
        ok: true,
        preview: {
          ...preview,
          title: preview.domain || preview.url,
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  return NextResponse.json(
    { ok: true, preview },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
