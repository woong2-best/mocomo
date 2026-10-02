import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { hasInboxUpdateSince, listMobileDmInbox } from "@/lib/chat-dm-service";

export const maxDuration = 10;

const POLL_MS = 800;
const HOLD_MS = 8000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Long-poll the mailbox so a new DM or used-market thread shows up without a refresh. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-messages-inbox-wait", 30);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const sinceRaw = req.nextUrl.searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(Date.now() - 4000);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const started = Date.now();
  while (Date.now() - started < HOLD_MS) {
    if (req.signal.aborted) {
      return NextResponse.json({ changed: false, serverTime: new Date().toISOString() });
    }
    const changed = await hasInboxUpdateSince(authResult.user.id, since, true);
    if (changed) {
      const rooms = await listMobileDmInbox(authResult.user.id);
      return NextResponse.json({
        changed: true,
        rooms,
        serverTime: new Date().toISOString(),
      });
    }
    await sleep(POLL_MS);
  }

  return NextResponse.json({ changed: false, serverTime: new Date().toISOString() });
}
