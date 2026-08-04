import { NextRequest, NextResponse } from "next/server";
import { isKakaoLocalConfigured, KakaoLocalNotConfiguredError } from "@/lib/kakao-local";
import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { isKakaoMapCountry, normalizeMeetCountry } from "@/lib/maps/select-engine";

export async function GET(req: NextRequest) {
  const country = normalizeMeetCountry(req.nextUrl.searchParams.get("country"));
  const region = req.nextUrl.searchParams.get("region")?.trim() ?? "";
  const place = req.nextUrl.searchParams.get("place")?.trim() ?? "";
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const query = q || [place, region].filter(Boolean).join(" ");
  if (!query) {
    return NextResponse.json({ error: "검색어가 필요합니다." }, { status: 400 });
  }

  if (isKakaoMapCountry(country) && !isKakaoLocalConfigured()) {
    return NextResponse.json(
      {
        error: "KAKAO_REST_API_KEY가 설정되지 않았습니다.",
        code: "KAKAO_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  try {
    const result = await geocodeMeetQuery({ country, region, place, q });
    if (!result) {
      return NextResponse.json({ error: "장소를 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ ...result, country });
  } catch (e) {
    if (e instanceof KakaoLocalNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: "KAKAO_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    const msg = e instanceof Error ? e.message : "지오코딩에 실패했습니다.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
