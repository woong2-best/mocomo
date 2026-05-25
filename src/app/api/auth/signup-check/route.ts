import { NextRequest, NextResponse } from "next/server";
import { checkSignupAvailability } from "@/actions/auth";

/** 가입 전 이메일/닉네임 상태 확인 (구체적 안내용) */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim() ?? "";
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const result = await checkSignupAvailability(email, username || "user000");
  return NextResponse.json(result);
}
