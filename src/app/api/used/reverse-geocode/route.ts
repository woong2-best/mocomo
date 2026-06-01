import { NextRequest, NextResponse } from "next/server";
import {
  isKakaoLocalConfigured,
  KakaoLocalNotConfiguredError,
  kakaoCoordToAddress,
} from "@/lib/kakao-local";

export async function GET(req: NextRequest) {
  if (!isKakaoLocalConfigured()) {
    return NextResponse.json(
      { error: "KAKAO_REST_API_KEY가 설정되지 않았습니다.", code: "KAKAO_NOT_CONFIGURED" },
      { status: 503 }
    );
  }

  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "좌표가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const label = await kakaoCoordToAddress(lat, lng);
    if (!label) {
      return NextResponse.json({ error: "주소를 찾지 못했습니다." }, { status: 404 });
    }
    return NextResponse.json({ lat, lng, label });
  } catch (e) {
    if (e instanceof KakaoLocalNotConfiguredError) {
      return NextResponse.json(
        { error: e.message, code: "KAKAO_NOT_CONFIGURED" },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "역지오코딩에 실패했습니다." }, { status: 500 });
  }
}
