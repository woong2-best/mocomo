import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ACCOUNT_SUSPENDED_WRITE_MESSAGE,
  assertAccountCanWrite,
  isServiceBanned,
  type AccountWriteKind,
} from "@/lib/account-status";
import { NextResponse } from "next/server";

const userSelect = {
  id: true,
  username: true,
  isBanned: true,
  accountStatus: true,
  deletedAt: true,
} as const;

export async function requireApiUser(options?: { writeKind?: AccountWriteKind }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: userSelect,
  });
  if (!user) {
    return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  }
  if (isServiceBanned(user)) {
    return { error: NextResponse.json({ error: "이용이 제한된 계정입니다." }, { status: 403 }) };
  }
  if (user.deletedAt) {
    return { error: NextResponse.json({ error: "탈퇴한 계정입니다." }, { status: 403 }) };
  }
  try {
    assertAccountCanWrite(user, options?.writeKind ?? "default");
  } catch {
    return {
      error: NextResponse.json(
        { error: ACCOUNT_SUSPENDED_WRITE_MESSAGE, code: "ACCOUNT_SUSPENDED" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
