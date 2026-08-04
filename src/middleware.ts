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
import { getOperatorUsername } from "@/lib/operator-config";
import {
  ADMIN_MFA_COOKIE,
  createAdminMfaCookieValue,
  verifyAdminMfaCookieValue,
  adminSecurityCookieOptions,
  ADMIN_MFA_IDLE_TTL_SEC,
} from "@/lib/admin/security/session-cookie";
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

export default edgeAuth(async (req) => {
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

  // 자체 송출만 차단 — /live 디렉터리·외부 임베드 룸(/voice/[id])·OBS 오버레이는 유지
  if (process.env.NEXT_PUBLIC_LIVE_ENABLED === "false") {
    const firstPartyOnly =
      pathname.startsWith("/avatar") ||
      pathname === "/voice/new" ||
      pathname.startsWith("/voice/new/");
    if (firstPartyOnly) {
      const res = NextResponse.redirect(new URL("/live?notice=first-party-ended", req.url));
      stampAppClientIfNeeded(req, res);
      return res;
    }
  }

  const isLoggedIn = !!req.auth?.user?.id;
  const isFullBanned = Boolean(req.auth?.user?.isBanned);
  const isDeleted = Boolean(req.auth?.user?.isDeleted);
  const isAdmin = pathname.startsWith("/admin");
  const isAdminLoginPage = pathname === "/admin/login";
  const isAdminEnrollPage = pathname.startsWith("/admin/enroll");
  const isAdminForbiddenPage = pathname === "/admin/forbidden";
  // /admin/login·enroll 은 별도 게이트 — 일반 /auth/signin 으로 보내지 않음
  const isProtected =
    protectedRoutes.some((r) => pathname.startsWith(r)) &&
    !isAdminLoginPage &&
    !isAdminEnrollPage;
  const isStudioProtected = studioProtectedPrefixes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));

  if (isStudioProtected && !isLoggedIn) {
    const callback = isStudioHostname(host)
      ? `${getStudioBaseUrl()}${pathname.replace(/^\/studio/, "") || "/"}`
      : pathname;
    const signIn = new URL(getMocomoSignInUrl(callback));
    const res = NextResponse.redirect(signIn);
    stampAppClientIfNeeded(req, res);
    return res;
  }

  if (isLoggedIn && (isFullBanned || isDeleted)) {
    const signOut = new URL("/auth/signin", req.url);
    signOut.searchParams.set("error", isFullBanned ? "banned" : "account_deleted");
    const res = NextResponse.redirect(signOut);
    stampAppClientIfNeeded(req, res);
    return res;
  }

  if (isProtected && !isLoggedIn) {
    // 관리자 영역은 /admin/login 으로
    if (isAdmin) {
      const signIn = new URL("/admin/login", req.url);
      signIn.searchParams.set("callbackUrl", pathname);
      const res = NextResponse.redirect(signIn);
      stampAppClientIfNeeded(req, res);
      return res;
    }
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(signIn);
    stampAppClientIfNeeded(req, res);
    return res;
  }
  if (isAuthPage && isLoggedIn && !isFullBanned && !isDeleted) {
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
  const isStaff = Boolean(req.auth?.user?.isStaff);
  const authUsername = String(req.auth?.user?.username ?? "")
    .trim()
    .toLowerCase();
  const isSiteOwnerByUsername = authUsername === getOperatorUsername();
  const isAdminStaff =
    isLoggedIn && (isStaff || isOperator || isSiteOwnerByUsername);

  // /admin/login · enroll · forbidden — 메인 사이트 로그인 여부와 무관하게 통과
  // (로그인 페이지에서 관리자 계정으로 다시 인증)
  if (isAdmin && (isAdminLoginPage || isAdminEnrollPage || isAdminForbiddenPage)) {
    if (isAdminLoginPage) {
      const userId = String(req.auth?.user?.id ?? "");
      const mfaOk =
        isAdminStaff &&
        userId &&
        (await verifyAdminMfaCookieValue(
          req.cookies.get(ADMIN_MFA_COOKIE)?.value,
          userId,
          "ok"
        ));
      // 관리자 MFA(비밀번호+Passkey+TOTP) 완료된 경우만 대시보드로
      if (mfaOk) {
        const res = NextResponse.redirect(new URL("/admin", req.url));
        stampAppClientIfNeeded(req, res);
        return res;
      }
    }
    if (isAdminEnrollPage) {
      if (!isLoggedIn) {
        const signIn = new URL("/admin/login", req.url);
        const res = NextResponse.redirect(signIn);
        stampAppClientIfNeeded(req, res);
        return res;
      }
      if (!isAdminStaff) {
        const res = NextResponse.redirect(new URL("/admin/login?error=forbidden", req.url));
        stampAppClientIfNeeded(req, res);
        return res;
      }
    }
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    stampAppClientIfNeeded(req, res);
    return res;
  }

  // 그 외 /admin/* — 반드시 관리자 MFA 완료 세션 필요
  if (isAdmin) {
    if (!isLoggedIn || !isAdminStaff) {
      const signIn = new URL("/admin/login", req.url);
      if (pathname !== "/admin") {
        signIn.searchParams.set("callbackUrl", pathname);
      }
      const res = NextResponse.redirect(signIn);
      stampAppClientIfNeeded(req, res);
      return res;
    }

    const userId = String(req.auth?.user?.id ?? "");
    const mfaCookie = req.cookies.get(ADMIN_MFA_COOKIE)?.value;
    const mfaOk = await verifyAdminMfaCookieValue(mfaCookie, userId, "ok");
    if (!mfaOk) {
      // 메인 사이트 로그인만으로는 불가 — 관리자 로그인부터 다시
      const signIn = new URL("/admin/login", req.url);
      if (pathname !== "/admin") {
        signIn.searchParams.set("callbackUrl", pathname);
      }
      const res = NextResponse.redirect(signIn);
      stampAppClientIfNeeded(req, res);
      return res;
    }

    const refreshed = await createAdminMfaCookieValue(userId, "ok", ADMIN_MFA_IDLE_TTL_SEC);
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    res.cookies.set(ADMIN_MFA_COOKIE, refreshed, {
      ...adminSecurityCookieOptions(12 * 60 * 60),
    });
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
