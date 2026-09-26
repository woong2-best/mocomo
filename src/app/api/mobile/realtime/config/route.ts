import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";

/**
 * GET /api/mobile/realtime/config
 * Public Supabase anon key for Realtime Broadcast. Not a service-role secret.
 */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const limited = await rateLimitPublicApi(req, `mobile-realtime-config:${auth.user.id}`, 30);
  if (limited) return limited;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "실시간 통화 설정이 없습니다." }, { status: 503 });
  }

  return NextResponse.json({ supabaseUrl, supabaseAnonKey });
}
