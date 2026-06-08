import { edgeAuth } from "@/lib/auth.edge";
import { isOperatorIdentity } from "@/lib/operator-config";
import { NextResponse } from "next/server";

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

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;

  if (
    process.env.NEXT_PUBLIC_LIVE_ENABLED === "false" &&
    (pathname.startsWith("/live") || pathname.startsWith("/voice"))
  ) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const isLoggedIn = !!req.auth?.user?.id;
  const isBanned = Boolean(req.auth?.user?.isBanned);
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = pathname.startsWith("/admin");

  if (isLoggedIn && isBanned) {
    const signOut = new URL("/auth/signin", req.url);
    signOut.searchParams.set("error", "banned");
    return NextResponse.redirect(signOut);
  }

  if (isProtected && !isLoggedIn) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }
  if (isAuthPage && isLoggedIn && !isBanned) {
    const callback = req.nextUrl.searchParams.get("callbackUrl");
    const dest =
      callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/";
    return NextResponse.redirect(new URL(dest, req.url));
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
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/settings/:path*",
    "/messages/:path*",
    "/admin/:path*",
    "/compose",
    "/compose/:path*",
    "/notifications/:path*",
    "/star/:path*",
    "/bookmarks",
    "/bookmarks/:path*",
    "/my-page/:path*",
    "/wallet/:path*",
    "/used/new",
    "/used/my",
    "/used/verify",
  "/used/adult-verify",
    "/premium/:path*",
    "/support/:path*",
    "/voice/:path*",
    "/avatar/:path*",
    "/live/:path*",
    "/cosplay/apply",
    "/auth/signin",
    "/auth/signup",
  ],
};
