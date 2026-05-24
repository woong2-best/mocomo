import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthConfigStatus, isAuthConfigured } from "@/lib/auth-env";

export async function GET() {
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const auth = getAuthConfigStatus();
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
    },
    { status: ok ? 200 : 503 }
  );
}
