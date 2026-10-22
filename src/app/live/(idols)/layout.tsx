import type { ReactNode } from "react";
import { IdolGroupRoom } from "@/components/live/ai-host/idol-group-room";
import { LiveFeatureDisabledNotice } from "@/components/live/live-feature-disabled";
import { ensureIdolChannels } from "@/lib/ai-live/official-channel";
import { isLiveFeatureEnabled } from "@/lib/live-feature";

export const dynamic = "force-dynamic";

/** Shared by the three member URLs so a tab change does not rebuild the 3D scene. */
export default async function IdolGroupLayout({ children }: { children: ReactNode }) {
  if (!isLiveFeatureEnabled()) return <LiveFeatureDisabledNotice />;
  const channels = await ensureIdolChannels().catch(() => ({}));
  return (
    <>
      <IdolGroupRoom channels={channels} />
      {children}
    </>
  );
}
