import { edgeAuth } from "@/lib/auth.edge";
import { isOperatorIdentity } from "@/lib/operator-config";
import { NextResponse } from "next/server";

const protectedRoutes = [
  "/settings",
  "/messages",
  "/admin",
  "/compose",
  "/notifications",
  "/bookmarks",
  "/my-page",
  "/wallet",
  "/used/new",
  "/used/my",
  "/market/sell",
  "/market/storage",
];
const authRoutes = ["/auth/signin", "/auth/signup"];

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    const signIn = new URL("/auth/signin", req.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
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
    "/compose/:path*",
    "/notifications/:path*",
    "/bookmarks/:path*",
    "/my-page/:path*",
    "/wallet/:path*",
    "/used/new",
    "/used/my",
    "/market/sell",
    "/market/storage",
    "/auth/signin",
    "/auth/signup",
  ],
};
