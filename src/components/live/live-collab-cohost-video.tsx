"use client";

import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

import { useLocale } from "@/components/providers/locale-provider";
import { VideoTrack, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { Loader2, Users } from "lucide-react";
import { liveCollabCoHostIdentity } from "@/lib/live-participant";

/** LiveKitRoom 안 — CO_HOST 카메라만 표시 */
export function LiveCollabCoHostVideo({
  coHostUserId,
  label,
}: {
  coHostUserId: string;
  label?: string;
}) {
  const { t } = useLocale();
  const identity = liveCollabCoHostIdentity(coHostUserId);
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: true }
  );

  const track = tracks.find(
    (t) =>
      t.participant.identity === identity &&
      (t.source === Track.Source.Camera || t.source === Track.Source.ScreenShare) &&
      t.publication
  );

  if (!track) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white/75">
        <Loader2 className="h-8 w-8 animate-spin" />
        <Users className="h-6 w-6" />
        <p className="text-xs text-center px-3">{label ?? t("live.sy8ysg")}</p>
      </div>
    );
  }

  return <VideoTrack trackRef={track} className="absolute inset-0 h-full w-full object-cover" />;
}

/** LiveKitRoom 안 — 로컬(합방) 카메라 미리보기 */
export function LiveCollabLocalPreview() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const local = tracks.find((t) => t.source === Track.Source.Camera && t.publication);

  if (!local) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-white/75">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-xs">{t("live.s1hx8h3h")}</p>
      </div>
    );
  }

  return <VideoTrack trackRef={local} className="absolute inset-0 h-full w-full object-cover" />;
}
