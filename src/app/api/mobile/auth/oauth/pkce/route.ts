import { NextResponse } from "next/server";

/** OAuth PKCE exchange — Phase 1.1. Credentials login is available now. */
export async function POST() {
  return NextResponse.json(
    {
      error: "OAuth PKCE는 다음 단계에서 지원됩니다. 이메일/비밀번호 로그인을 사용해 주세요.",
      code: "oauth_pkce_not_ready",
    },
    { status: 501 }
  );
}
