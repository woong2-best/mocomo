import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthConfigStatus, isAuthConfigured } from "@/lib/auth-env";
import { getEmailConfigStatus } from "@/lib/email";
import { isLivekitConfigured } from "@/lib/livekit";

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const auth = { ...getAuthConfigStatus(), ...getEmailConfigStatus() };
  const ok = dbOk && isAuthConfigured();

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      service: "mocomo",
      db: dbOk ? "connected" : "disconnected",
      auth: {
        ...auth,
        ready: isAuthConfigured(),
      },
      calls: {
        livekit: isLivekitConfigured(),
        signaling: "polling",
      },
    },
    { status: ok ? 200 : 503 }
  );
}
