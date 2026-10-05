"use client";

import { LiveStillPoster } from "@/components/live/live-still-poster";

type Props = {
  channelId: string;
  broadcastMode?: string | null;
  active: boolean;
  posterUrl?: string | null;
  className?: string;
};

/** Hub cards show a frozen still — never a playing preview. */
export function LiveHeroPreviewVideo({ posterUrl, className }: Props) {
  return <LiveStillPoster src={posterUrl} className={className} />;
}
