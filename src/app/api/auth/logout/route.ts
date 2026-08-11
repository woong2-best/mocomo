import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
import { clearAllSessionCookies } from "@/lib/account-switch/session-cookies";

/** Hard logout — clears Auth.js session plus legacy/chunked cookie variants. */
export async function POST() {
  try {
    await signOut({ redirect: false });
  } catch (e) {
    console.error("[api/auth/logout] signOut", e);
  }

  await clearAllSessionCookies();

  const jar = await cookies();
  jar.set(ADD_ACCOUNT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}
