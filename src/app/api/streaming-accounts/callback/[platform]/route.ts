import { NextResponse } from "next/server";
import { isConnectablePlatform } from "@/lib/streaming-accounts/types";
import { completeOAuthConnect } from "@/lib/streaming-accounts/service";
import {
  safeStreamingReturnTo,
  verifyStreamingOAuthState,
} from "@/lib/streaming-accounts/oauth-state";
import { revalidateProfileStreamingForUser } from "@/lib/revalidate-profile-streaming";
import { enableStreamingOnProfile } from "@/lib/profile-social";

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

  const statePayload =
    state && isConnectablePlatform(platform)
      ? verifyStreamingOAuthState(state, platform)
      : { error: "invalid_callback" };
  const returnTo =
    "error" in statePayload
      ? "/settings/streaming-accounts"
      : safeStreamingReturnTo(statePayload.returnTo);
  const dest = new URL(returnTo, req.url);

  if (oauthError) {
    const message =
      oauthError === "access_denied"
        ? "Sign-in was cancelled or the app still needs approval. Please try again."
        : oauthError;
    dest.searchParams.set("error", message);
    return NextResponse.redirect(dest);
  }

  if (!isConnectablePlatform(platform) || !code || !state) {
    dest.searchParams.set("error", "invalid_callback");
    return NextResponse.redirect(dest);
  }

  const result = await completeOAuthConnect(platform, code, state);
  if (!result.ok) {
    dest.searchParams.set("error", result.error);
    return NextResponse.redirect(dest);
  }

  if (!("error" in statePayload)) {
    if (statePayload.showOnProfile) {
      await enableStreamingOnProfile(
        statePayload.userId,
        platform === "TWITCH" ? "twitch" : "youtube"
      );
    }
    await revalidateProfileStreamingForUser(statePayload.userId);
  }

  dest.searchParams.set("connected", platform);
  return NextResponse.redirect(dest);
}
