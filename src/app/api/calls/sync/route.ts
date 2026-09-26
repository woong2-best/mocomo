import { NextResponse } from "next/server";
import { getCachedAuthUserMinimal } from "@/lib/auth";
import { getCallSyncForUser } from "@/lib/call-sync";

/** Socket 서버 없이도 통화 알림/상태 동기화 (Vercel 프로덕션용) */
export async function GET() {
  const user = await getCachedAuthUserMinimal();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.isBanned) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getCallSyncForUser(user.id));
}
