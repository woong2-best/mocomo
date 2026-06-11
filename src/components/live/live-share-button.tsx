"use client";

import { LiveShareMenu } from "@/components/live/live-share-menu";

export function LiveShareButton({
  channelId,
  channelName,
}: {
  channelId: string;
  channelName?: string;
}) {
  return <LiveShareMenu channelId={channelId} channelName={channelName} variant="button" />;
}
