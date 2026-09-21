"use client";

import { ObsChatUrlCopy } from "@/components/live/obs-chat-url-copy";

type Props = {
  channelId: string;
};

/** Host-only: compact OBS chat URL copy on the live broadcast page. */
export function ExternalLiveHostDashboard({ channelId }: Props) {
  return <ObsChatUrlCopy channelId={channelId} variant="compact" className="mb-2" />;
}
