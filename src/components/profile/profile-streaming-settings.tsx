"use client";

import Link from "next/link";
import type { StreamingAccountPublic } from "@/lib/streaming-accounts/types";
import { ProfileStreamingBrandIcons } from "@/components/profile/profile-streaming-brand-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  accounts: StreamingAccountPublic[];
  showYoutubeOnProfile: boolean;
  showTwitchOnProfile: boolean;
  /** Associates toggles with the main profile form when this card sits outside it. */
  formId?: string;
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
  formId = "profile-settings-form",
}: Props) {
  const youtube = accountFor(accounts, "YOUTUBE");
  const twitch = accountFor(accounts, "TWITCH");

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base">YouTube &amp; Twitch</CardTitle>
          <ProfileStreamingBrandIcons />
        </div>
        <p className="text-sm text-muted-foreground">
          Connect and verify your channels, then choose whether they appear on your public profile.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
      <Link
        href="/settings/streaming-accounts"
        className="inline-flex text-sm font-medium text-primary hover:underline"
      >
        Connect or verify channels →
      </Link>

      {!youtube ? (
        <input
          type="hidden"
          form={formId}
          name="showYoutubeOnProfile"
          value={showYoutubeOnProfile ? "on" : "off"}
        />
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm sm:min-h-0 sm:py-0">
        <input
          type="checkbox"
          form={formId}
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
          form={formId}
          name="showTwitchOnProfile"
          value={showTwitchOnProfile ? "on" : "off"}
        />
      ) : null}
      <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm sm:min-h-0 sm:py-0">
        <input
          type="checkbox"
          form={formId}
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
      </CardContent>
    </Card>
  );
}
