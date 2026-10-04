import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import {
  disconnectStreamingAccount,
  listUserStreamingAccounts,
} from "@/lib/streaming-accounts/service";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-accounts", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req);
  if ("error" in auth) return auth.error;

  const rows = await listUserStreamingAccounts(auth.user.id);
  const accounts = rows
    .filter((row) => row.platform === "YOUTUBE" || row.platform === "TWITCH")
    .map((row) => ({
      id: row.id,
      platform: row.platform,
      channelId: row.channelId,
      channelName: row.channelName,
      channelUrl: row.channelUrl,
      profileImage: row.profileImage,
      verified: row.verified,
      pendingVerification: row.pendingVerification,
    }));

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-live-studio-disconnect", 15);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  let body: { accountId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const accountId = body.accountId?.trim();
  if (!accountId) {
    return NextResponse.json({ error: "Account not found." }, { status: 400 });
  }

  const result = await disconnectStreamingAccount(auth.user.id, accountId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  await revalidateProfileStreamingForUser(auth.user.id);
  return NextResponse.json({ success: true });
}
