import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { hasInboxUpdateSince } from "@/lib/chat-dm-service";

export const maxDuration = 10;

const POLL_MS = 800;
const HOLD_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Long-poll so the web mailbox updates while the messages page stays open. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "web-messages-inbox-wait", 30);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 4000);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid since" }, { status: 400 });
  }

  const started = Date.now();
  while (Date.now() - started < HOLD_MS) {
    if (req.signal.aborted) {
      return NextResponse.json({ changed: false, serverTime: new Date().toISOString() });
    }
    const changed = await hasInboxUpdateSince(session.user.id, since, false);
    if (changed) {
      return NextResponse.json({ changed: true, serverTime: new Date().toISOString() });
    }
    await sleep(POLL_MS);
  }

  return NextResponse.json({ changed: false, serverTime: new Date().toISOString() });
}
