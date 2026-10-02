import { errorText } from "@/lib/i18n/error-text";
import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { registerBodySchema, registerMobileUser } from "@/lib/mobile-signup-auth";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-auth-signup-register", 15);
  if (limited) return limited;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = registerBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input." }, { status: 400 });
  }

  const result = await registerMobileUser(parsed.data);
  if ("error" in result && result.error) {
    return NextResponse.json({ error: errorText(result.error) }, { status: 400 });
  }

  return NextResponse.json(result);
}
