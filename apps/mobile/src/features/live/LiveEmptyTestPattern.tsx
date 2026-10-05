import { memo } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useI18n } from "@/i18n/I18nProvider";
import { liveUi } from "@/features/live/live-ui";

/** Off-air hero — simple gray copy instead of TV artwork. */
function LiveEmptyTestPatternInner() {
  const { t } = useI18n();
  const copy = liveUi(t);
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));

  return (
    <View style={[styles.stage, { width, height }]}>
      <Text style={styles.message}>{copy.noLiveNow}</Text>
    </View>
  );
}

export const LiveEmptyTestPattern = memo(LiveEmptyTestPatternInner);

const styles = StyleSheet.create({
  stage: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  message: {
    color: "#9CA3AF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
});
