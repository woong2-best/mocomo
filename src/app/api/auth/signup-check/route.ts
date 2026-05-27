import { NextRequest, NextResponse } from "next/server";
import { checkSignupAvailability } from "@/actions/auth";
import { rateLimitPublicApi } from "@/lib/api-security";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "signup-check", 30);
  if (limited) return limited;

  const email = req.nextUrl.searchParams.get("email")?.trim() ?? "";
  const username = req.nextUrl.searchParams.get("username")?.trim() ?? "";

  if (!email) {
    return NextResponse.json({ error: "email required" }, { status: 400 });
  }

  const result = await checkSignupAvailability(email, username || "user000");
  return NextResponse.json(result);
}
