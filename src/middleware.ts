import { edgeAuth } from "@/lib/auth.edge";
import {
  shouldGuardMutatingApiOrigin,
  verifyApiOrigin,
} from "@/lib/api-origin";
import {
  CLIENT_PLATFORM_COOKIE,
  CLIENT_PLATFORM_MAX_AGE,
  isAppHostname,
} from "@/lib/client-platform";
import {
  getMocomoSignInUrl,
  getStudioBaseUrl,
  isStudioHostname,
  resolveRequestHostname,
  studioInternalPath,
} from "@/studio/lib/host";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
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
const studioProtectedPrefixes = [
  "/studio/create",
  "/studio/assets",
  "/studio/library",
  "/studio/wallet",
  "/studio/settings",
  "/studio/following",
  "/studio/admin",
];

function setAppClientCookie(res: NextResponse) {
  res.cookies.set(CLIENT_PLATFORM_COOKIE, "app", {
    path: "/",
    maxAge: CLIENT_PLATFORM_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

function clearAppClientCookie(res: NextResponse) {
  res.cookies.set(CLIENT_PLATFORM_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

/** mocomo.net?client=app → app.mocomo.net (앱 전용 서브도메인) */
function applyAppClientRedirect(req: NextRequest): NextResponse | null {
  if (req.nextUrl.searchParams.get("client") !== "app") return null;

  const host = req.nextUrl.hostname;
  if (isAppHostname(host)) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("client");
    const res = NextResponse.redirect(url);
    setAppClientCookie(res);
    return res;
  }

  const appHost = process.env.NEXT_PUBLIC_APP_HOST?.trim() || "app.mocomo.net";
  const url = req.nextUrl.clone();
  url.hostname = appHost.split(":")[0] ?? appHost;
  url.port = "";
  url.protocol = "https:";
  url.searchParams.delete("client");
  const res = NextResponse.redirect(url);
  setAppClientCookie(res);
  return res;
}

function stampAppClientIfNeeded(req: NextRequest, res: NextResponse) {
  const host = req.nextUrl.hostname;

  if (!isAppHostname(host)) {
    if (req.cookies.get(CLIENT_PLATFORM_COOKIE)?.value === "app") {
      clearAppClientCookie(res);
    }
    return;
  }

  if (req.cookies.get(CLIENT_PLATFORM_COOKIE)?.value !== "app") {
    setAppClientCookie(res);
  }
}

export default edgeAuth((req) => {
  const clientRedirect = applyAppClientRedirect(req);
  if (clientRedirect) return clientRedirect;

  const host = resolveRequestHostname(
    req.headers.get("x-forwarded-host") ?? req.headers.get("host"),
    req.nextUrl.hostname
  );
  const { pathname } = req.nextUrl;

  if (shouldGuardMutatingApiOrigin(pathname, req.method)) {
    if (!verifyApiOrigin(req)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  if (isStudioHostname(host)) {
    if (
      !pathname.startsWith("/studio") &&
      !pathname.startsWith("/api") &&
      !pathname.startsWith("/auth") &&
      !pathname.startsWith("/_next")
    ) {
      const url = req.nextUrl.clone();
      url.pathname = studioInternalPath(pathname);
      const res = NextResponse.rewrite(url);
      res.headers.set("x-studio-host", "1");
      return res;
    }
  }

  if (
    process.env.NEXT_PUBLIC_LIVE_ENABLED === "false" &&
    (pathname.startsWith("/live") || pathname.startsWith("/voice"))
  ) {
    const res = NextResponse.redirect(new URL(DEFAULT_LANDING_PATH, req.url));
    stampAppClientIfNeeded(req, res);
    return res;
  }

  const isLoggedIn = !!req.auth?.user?.id;
  const isBanned = Boolean(req.auth?.user?.isBanned);
  const isDeleted = Boolean(req.auth?.user?.isDeleted);
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isStudioProtected = studioProtectedPrefixes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = pathname.startsWith("/admin");

  if (isStudioProtected && !isLoggedIn) {
    const callback = isStudioHostname(host)
      ? `${getStudioBaseUrl()}${pathname.replace(/^\/studio/, "") || "/"}`
      : pathname;
    const signIn = new URL(getMocomoSignInUrl(callback));
    const res = NextResponse.redirect(signIn);
    stampAppClientIfNeeded(req, res);
    return res;
  }

  if (isLoggedIn && (isBanned || isDeleted)) {
    const signOut = new URL("/auth/signin", req.url);
    signOut.searchParams.set("error", isBanned ? "banned" : "account_deleted");
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
  if (isAuthPage && isLoggedIn && !isBanned && !isDeleted) {
    const addingAccount =
      req.nextUrl.searchParams.get("addAccount") === "1" ||
      req.cookies.get(ADD_ACCOUNT_COOKIE)?.value === "1";
    if (!addingAccount) {
      const callback = req.nextUrl.searchParams.get("callbackUrl");
      const dest =
        callback?.startsWith("/") && !callback.startsWith("//") ? callback : DEFAULT_LANDING_PATH;
      const res = NextResponse.redirect(new URL(dest, req.url));
      stampAppClientIfNeeded(req, res);
      return res;
    }
  }
  const isOperator = Boolean(req.auth?.user?.isOperator);
  if (isAdmin && !isOperator) {
    const res = NextResponse.redirect(new URL(DEFAULT_LANDING_PATH, req.url));
    stampAppClientIfNeeded(req, res);
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  stampAppClientIfNeeded(req, res);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|wasm|task|js|css|woff2?)$).*)",
  ],
};
