"use client";

import Link from "next/link";
import type { StreamingAccountPublic } from "@/lib/streaming-accounts/types";

type Props = {
  accounts: StreamingAccountPublic[];
  showYoutubeOnProfile: boolean;
  showTwitchOnProfile: boolean;
};

function accountFor(
  accounts: StreamingAccountPublic[],
  platform: "YOUTUBE" | "TWITCH"
): StreamingAccountPublic | undefined {
  return accounts.find((a) => a.platform === platform && a.verified);
}

export function ProfileStreamingSettings({
  accounts,
  showYoutubeOnProfile,
  showTwitchOnProfile,
}: Props) {
  const youtube = accountFor(accounts, "YOUTUBE");
  const twitch = accountFor(accounts, "TWITCH");

  return (
    <div className="rounded-xl border border-border/60 p-4 space-y-4 bg-muted/20">
      <div>
        <p className="text-sm font-medium">YouTube &amp; Twitch</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Link and verify channels under streaming settings. Verified channels can appear on your
          public profile.
        </p>
        <Link
          href="/settings/streaming-accounts"
          className="inline-block mt-2 text-sm text-primary hover:underline"
        >
          Manage channel verification →
        </Link>
      </div>

      {!youtube ? (
        <input
          type="hidden"
          name="showYoutubeOnProfile"
          value={showYoutubeOnProfile ? "on" : "off"}
        />
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm sm:min-h-0 sm:py-0">
        <input
          type="checkbox"
          name={youtube ? "showYoutubeOnProfile" : undefined}
          defaultChecked={showYoutubeOnProfile}
          disabled={!youtube}
          className="mt-1 h-5 w-5 shrink-0 sm:mt-0.5"
        />
        <span>
          <span className="font-medium">Show YouTube on profile</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {youtube
              ? `Linked: ${youtube.channelName}`
              : "Connect and verify YouTube to enable."}
          </span>
        </span>
      </label>

      {!twitch ? (
        <input
          type="hidden"
          name="showTwitchOnProfile"
          value={showTwitchOnProfile ? "on" : "off"}
        />
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm sm:min-h-0 sm:py-0">
        <input
          type="checkbox"
          name={twitch ? "showTwitchOnProfile" : undefined}
          defaultChecked={showTwitchOnProfile}
          disabled={!twitch}
          className="mt-1 h-5 w-5 shrink-0 sm:mt-0.5"
        />
        <span>
          <span className="font-medium">Show Twitch on profile</span>
          <span className="block text-xs text-muted-foreground mt-0.5">
            {twitch ? `Linked: ${twitch.channelName}` : "Connect and verify Twitch to enable."}
          </span>
        </span>
      </label>
    </div>
  );
}
