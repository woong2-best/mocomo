import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  loadAccountDeletionUser,
  requestAccountDeletionForUser,
} from "@/lib/account-deletion-request";

export async function POST(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-account-delete", 10);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const full = await loadAccountDeletionUser(auth.user.id);
  if (!full) {
    return NextResponse.json({ error: "계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const result = await requestAccountDeletionForUser(full, json as never);

  if ("error" in result && result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
