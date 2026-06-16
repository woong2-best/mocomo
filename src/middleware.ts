import { edgeAuth } from "@/lib/auth.edge";
import { isOperatorIdentity } from "@/lib/operator-config";
import {
  CLIENT_PLATFORM_COOKIE,
  CLIENT_PLATFORM_MAX_AGE,
  isAppHostname,
} from "@/lib/client-platform";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = [
  "/settings",
  "/messages",
  "/admin",
  "/compose",
  "/notifications",
  "/star",
  "/my-page",
  "/wallet",
  "/used/new",
  "/used/my",
  "/used/verify",
  "/used/adult-verify",
  "/premium",
  "/support",
  "/voice",
  "/avatar",
  "/cosplay/apply",
];
const authRoutes = ["/auth/signin", "/auth/signup"];

function setAppClientCookie(res: NextResponse) {
  res.cookies.set(CLIENT_PLATFORM_COOKIE, "app", {
    path: "/",
    maxAge: CLIENT_PLATFORM_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function applyAppClientRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.searchParams.get("client") !== "app") return null;
  const url = req.nextUrl.clone();
  url.searchParams.delete("client");
  const res = NextResponse.redirect(url);
  setAppClientCookie(res);
  return res;
}

function stampAppClientIfNeeded(req: NextRequest, res: NextResponse) {
  const host = req.nextUrl.hostname;
  const wantsApp =
    isAppHostname(host) ||
    req.nextUrl.searchParams.get("client") === "app" ||
    req.cookies.get(CLIENT_PLATFORM_COOKIE)?.value === "app";

  if (wantsApp && req.cookies.get(CLIENT_PLATFORM_COOKIE)?.value !== "app") {
    setAppClientCookie(res);
  }
}

export default edgeAuth((req) => {
  const clientRedirect = applyAppClientRedirect(req);
  if (clientRedirect) return clientRedirect;

  const { pathname } = req.nextUrl;

  if (
    process.env.NEXT_PUBLIC_LIVE_ENABLED === "false" &&
    (pathname.startsWith("/live") || pathname.startsWith("/voice"))
  ) {
    const res = NextResponse.redirect(new URL("/", req.url));
    stampAppClientIfNeeded(req, res);
    return res;
  }

  const isLoggedIn = !!req.auth?.user?.id;
  const isBanned = Boolean(req.auth?.user?.isBanned);
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = pathname.startsWith("/admin");

  if (isLoggedIn && isBanned) {
    const signOut = new URL("/auth/signin", req.url);
    signOut.searchParams.set("error", "banned");
    const res = NextResponse.redirect(signOut);
    stampAppClientIfNeeded(req, res);
    return res;
  }

  if (isProtected && !isLoggedIn) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(signIn);
    stampAppClientIfNeeded(req, res);
    return res;
  }
  if (isAuthPage && isLoggedIn && !isBanned) {
    const callback = req.nextUrl.searchParams.get("callbackUrl");
    const dest =
      callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/";
    const res = NextResponse.redirect(new URL(dest, req.url));
    stampAppClientIfNeeded(req, res);
    return res;
  }
  const sessionUser = req.auth?.user;
  const isOperator =
    !!sessionUser?.username &&
    !!sessionUser?.role &&
    isOperatorIdentity({
      username: sessionUser.username,
      role: sessionUser.role,
    });
  if (isAdmin && !isOperator) {
    const res = NextResponse.redirect(new URL("/", req.url));
    stampAppClientIfNeeded(req, res);
    return res;
  }

  const res = NextResponse.next();
  stampAppClientIfNeeded(req, res);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|task|js|css|woff2?)$).*)",
  ],
};
