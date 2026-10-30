import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AiVrmStage } from "@/features/live/ai/AiVrmStage";
import type { AiStageFiles } from "@/features/live/ai/ai-speak";
import { subscribeVrmStills, vrmStillUri } from "@/features/live/ai/vrm-still-cache";

/**
 * Capture one missing still off-screen. Do not mount this on a scroll list —
 * Android WebView ignores opacity/overflow and paints the model over siblings.
 */
export function VrmStillWarmer({ stages }: { stages: AiStageFiles[] }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVrmStills(() => setTick((n) => n + 1)), []);
  const next = stages.find((row) => !vrmStillUri(row.characterId)) ?? null;
  if (!next) return null;
  return (
    <View pointerEvents="none" style={styles.hidden} collapsable={false}>
      <AiVrmStage
        key={next.characterId}
        vrmUrl={next.vrmUrl}
        backdropUrl={next.backdropUrl}
        characterId={next.characterId}
        framing="bust"
        maxPixelRatio={1}
        inList
        saveStill={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 192,
    height: 108,
    left: -400,
    top: -400,
    opacity: 0,
    zIndex: 0,
    overflow: "hidden",
  },
});
