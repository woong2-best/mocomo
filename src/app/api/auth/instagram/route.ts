import { NextRequest, NextResponse } from "next/server";

/** Legacy Instagram Login entry — redirect to Facebook Login. */
export async function GET(req: NextRequest) {
  const url = new URL("/api/auth/facebook", req.url);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url);
}
