import { edgeAuth } from "@/lib/auth.edge";
import { NextResponse } from "next/server";

const protectedRoutes = ["/settings", "/messages", "/admin", "/compose"];
const authRoutes = ["/auth/signin", "/auth/signup"];

export default edgeAuth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user?.id;
  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthPage = authRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = pathname.startsWith("/admin");

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (isAdmin && req.auth?.user?.role !== "ADMIN" && req.auth?.user?.role !== "MODERATOR") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
