import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AiVrmStage } from "@/features/live/ai/AiVrmStage";
import type { AiStageFiles } from "@/features/live/ai/ai-speak";
import { subscribeVrmStills, vrmStillUri } from "@/features/live/ai/vrm-still-cache";

/**
 * After the hub hero has a still (so its WebGL is gone), render one
 * remaining character at a time and persist the frame. Cards then stay
 * filled without four live WebViews.
 */
export function VrmStillWarmer({ stages }: { stages: AiStageFiles[] }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVrmStills(() => setTick((n) => n + 1)), []);
  const next = vrmStillUri("zelie") ? stages.find((row) => !vrmStillUri(row.characterId)) : null;
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    position: "absolute",
    width: 192,
    height: 108,
    left: 0,
    top: 0,
    opacity: 0.01,
    zIndex: 0,
    overflow: "hidden",
  },
});
