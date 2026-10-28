import { NextRequest, NextResponse } from "next/server";

/** Legacy callback path — Meta app may still list the old URI during migration. */
export async function GET(req: NextRequest) {
  const url = new URL("/api/auth/facebook/callback", req.url);
  url.search = req.nextUrl.search;
  return NextResponse.redirect(url);
}
