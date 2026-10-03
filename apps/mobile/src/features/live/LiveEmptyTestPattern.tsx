import { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { useI18n } from "@/i18n/I18nProvider";
import { liveUi } from "@/features/live/live-ui";

const OFF_AIR_TV = require("../../../assets/live/off-air-tv.png");

/** Off-air hero. The TV artwork is shown unchanged inside the 16:9 stage. */
function LiveEmptyTestPatternInner() {
  const { t } = useI18n();
  const copy = liveUi(t);
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));

  return (
    <View style={[styles.stage, { width, height }]}>
      <Image
        source={OFF_AIR_TV}
        style={styles.photo}
        contentFit="contain"
        contentPosition="center"
        accessibilityLabel={copy.noStreamsEmpty}
      />
    </View>
  );
}

export const LiveEmptyTestPattern = memo(LiveEmptyTestPatternInner);

const styles = StyleSheet.create({
  stage: {
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
});
