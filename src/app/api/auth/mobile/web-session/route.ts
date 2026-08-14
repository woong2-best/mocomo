import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { effectiveRole } from "@/lib/operator-config";
import { encodeSessionFromPayload, setSessionCookie } from "@/lib/account-switch/server";
import { openMobileWebSessionHandoff } from "@/lib/mobile-web-session-handoff";

export async function GET(req: NextRequest) {
  const handoffRaw = req.nextUrl.searchParams.get("handoff")?.trim();
  if (!handoffRaw) {
    return NextResponse.redirect(new URL("/auth/signin?error=handoff", req.url));
  }

  const handoff = openMobileWebSessionHandoff(handoffRaw);
  if (!handoff) {
    return NextResponse.redirect(new URL("/auth/signin?error=handoff_expired", req.url));
  }

  const user = await db.user.findUnique({
    where: { id: handoff.userId },
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      role: true,
      premiumTier: true,
      locale: true,
      countryCode: true,
      isBanned: true,
    },
  });

  if (!user || user.isBanned) {
    return NextResponse.redirect(new URL("/auth/signin?error=blocked", req.url));
  }

  const encoded = await encodeSessionFromPayload({
    id: user.id,
    sub: user.id,
    username: user.username,
    name: user.name,
    image: user.image,
    role: effectiveRole(user),
    premiumTier: user.premiumTier,
    locale: user.locale,
    countryCode: user.countryCode,
    isBanned: user.isBanned,
  });

  if (!encoded) {
    return NextResponse.redirect(new URL("/auth/signin?error=session", req.url));
  }

  await setSessionCookie(encoded);

  return NextResponse.redirect(new URL(handoff.redirect, req.url));
}
