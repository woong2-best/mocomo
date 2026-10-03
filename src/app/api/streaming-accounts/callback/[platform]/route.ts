import { NextResponse } from "next/server";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import { completeOAuthConnect } from "@/lib/streaming-accounts/service";
import { verifyStreamingOAuthState } from "@/lib/streaming-accounts/oauth-state";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ platform: string }> }
) {
  const { platform: raw } = await ctx.params;
  const platform = raw.toUpperCase();
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const settingsUrl = new URL("/settings/streaming-accounts", req.url);

  if (oauthError) {
    const message =
      oauthError === "access_denied"
        ? "로그인이 취소되었거나 앱 승인이 필요합니다. 다시 시도해 주세요."
        : oauthError;
    settingsUrl.searchParams.set("error", message);
    return NextResponse.redirect(settingsUrl);
  }

  if (!isConnectablePlatform(platform) || !code || !state) {
    settingsUrl.searchParams.set("error", "invalid_callback");
    return NextResponse.redirect(settingsUrl);
  }

  const result = await completeOAuthConnect(platform, code, state);
  if (!result.ok) {
    settingsUrl.searchParams.set("error", result.error);
    return NextResponse.redirect(settingsUrl);
  }

  const statePayload = verifyStreamingOAuthState(state, platform);
  if (!("error" in statePayload)) {
    await revalidateProfileStreamingForUser(statePayload.userId);
  }

  settingsUrl.searchParams.set("connected", platform);
  return NextResponse.redirect(settingsUrl);
}
