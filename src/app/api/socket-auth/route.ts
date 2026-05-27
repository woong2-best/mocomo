import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createSocketAuthToken } from "@/lib/socket-auth-token";
import { db } from "@/lib/db";

export const runtime = "nodejs";

/** Socket.IO 연결용 단기 토큰 (5분) — userId 위조 방지 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isBanned: true },
  });
  if (!user || user.isBanned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    token: createSocketAuthToken(user.id),
    expiresIn: 300,
  });
}
