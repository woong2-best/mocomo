import { NextResponse } from "next/server";
import { createSocketAuthToken } from "@/lib/socket-auth-token";
import { getJwtSessionUser } from "@/lib/session-jwt";

export const runtime = "nodejs";

/** Socket.IO 연결용 단기 토큰 (5분) — userId 위조 방지 */
export async function GET() {
  try {
    const user = await getJwtSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      token: createSocketAuthToken(user.id),
      expiresIn: 300,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
