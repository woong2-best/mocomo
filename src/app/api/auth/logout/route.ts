import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { signOut } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
import { clearAllSessionCookies } from "@/lib/account-switch/session-cookies";

/** Hard logout — clears Auth.js session plus legacy/chunked cookie variants. */
export async function POST(req: NextRequest) {
  const preserveAddAccount = req.nextUrl.searchParams.get("preserveAddAccount") === "1";

  try {
    await signOut({ redirect: false });
  } catch (e) {
    console.error("[api/auth/logout] signOut", e);
  }

  await clearAllSessionCookies();

  const jar = await cookies();
  if (preserveAddAccount) {
    jar.set(ADD_ACCOUNT_COOKIE, "1", {
      path: "/",
      maxAge: 3600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    jar.set(ADD_ACCOUNT_COOKIE, "", {
      path: "/",
      maxAge: 0,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return NextResponse.json({ ok: true });
}
