import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { createSocketAuthToken } from "@/lib/socket-auth-token";

/** GET /api/mobile/socket-auth — Bearer token for Socket.IO handshake */
export async function GET(req: NextRequest) {
  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  return NextResponse.json({
    token: createSocketAuthToken(auth.user.id),
    expiresIn: 300,
  });
}
