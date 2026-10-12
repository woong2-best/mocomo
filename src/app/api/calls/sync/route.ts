import { NextResponse } from "next/server";
import { getCallSyncForUser } from "@/lib/call-sync";
import { getJwtSessionUser } from "@/lib/session-jwt";

/** Socket 서버 없이도 통화 알림/상태 동기화 (Vercel 프로덕션용) */
export async function GET() {
  try {
    const user = await getJwtSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.isBanned) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(await getCallSyncForUser(user.id));
  } catch {
    return NextResponse.json({ event: null });
  }
}
