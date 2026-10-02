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
    return { error: NextResponse.json({ error: "Sign-in required." }, { status: 401 }) };
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: userSelect,
  });
  if (!user) {
    return { error: NextResponse.json({ error: "Sign-in required." }, { status: 401 }) };
  }
  if (isServiceBanned(user)) {
    return { error: NextResponse.json({ error: "This account is restricted." }, { status: 403 }) };
  }
  if (user.deletedAt) {
    return { error: NextResponse.json({ error: "This account has been deleted." }, { status: 403 }) };
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
