import { NextResponse } from "next/server";
import { z } from "zod";
import {
  encodeSessionFromPayload,
  setSessionCookie,
  validateSwitchToken,
} from "@/lib/account-switch/server";

const bodySchema = z.object({
  userId: z.string().min(1).max(64),
  switchToken: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "INVALID_INPUT" }, { status: 400 });
    }

    const { userId, switchToken } = parsed.data;
    const validated = await validateSwitchToken(userId, switchToken);
    if (!validated.ok) {
      const status =
        validated.error === "BANNED" ? 403 : validated.error === "USER_NOT_FOUND" ? 404 : 401;
      return NextResponse.json({ ok: false, error: validated.error }, { status });
    }

    const fresh = await dbRefreshTokenPayload(validated.user.id, validated.payload);
    const encoded = await encodeSessionFromPayload(fresh);
    if (!encoded) {
      return NextResponse.json({ ok: false, error: "ENCODE_FAILED" }, { status: 500 });
    }

    await setSessionCookie(encoded);

    return NextResponse.json({
      ok: true,
      user: {
        id: validated.user.id,
        username: validated.user.username,
        name: validated.user.name,
        image: validated.user.image,
      },
      switchToken: encoded,
    });
  } catch (e) {
    console.error("[api/auth/accounts/switch]", e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}

async function dbRefreshTokenPayload(
  userId: string,
  existing: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { db } = await import("@/lib/db");
  const { effectiveRole } = await import("@/lib/operator-config");

  const dbUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      username: true,
      role: true,
      premiumTier: true,
      level: true,
      locale: true,
      countryCode: true,
      isBanned: true,
    },
  });
  if (!dbUser) return existing;

  return {
    ...existing,
    id: userId,
    sub: userId,
    username: dbUser.username,
    role: effectiveRole(dbUser),
    premiumTier: dbUser.premiumTier,
    level: dbUser.level,
    locale: dbUser.locale,
    countryCode: dbUser.countryCode,
    isBanned: dbUser.isBanned,
  };
}
