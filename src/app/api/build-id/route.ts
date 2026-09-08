import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** 클라이언트가 로드한 JS 번들과 HTML 배포 버전 불일치 감지용 */
export async function GET() {
  const id =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ??
    process.env.NEXT_PUBLIC_APT_BUILD_ID ??
    "local";
  return NextResponse.json({ id });
}
