import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { extractBearerToken, requireMobileApiUser } from "@/lib/api-mobile-auth";

export type DonateApiUserResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse };

export async function resolveDonateApiUser(req: NextRequest): Promise<DonateApiUserResult> {
  const bearer = extractBearerToken(req);
  if (bearer) {
    const mobile = await requireMobileApiUser(req, { writeKind: "default" });
    if ("error" in mobile) {
      return { ok: false, response: mobile.error ?? NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
    }
    return { ok: true, userId: mobile.user.id };
  }

  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  return { ok: true, userId: session.user.id };
}
