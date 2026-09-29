import { memo } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";

const OFF_AIR_TV = require("../../../assets/live/off-air-tv.png");

/** Off-air hero. The TV artwork is shown unchanged inside the 16:9 stage. */
function LiveEmptyTestPatternInner() {
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));

  return (
    <View style={[styles.stage, { width, height }]}>
      <Image
        source={OFF_AIR_TV}
        style={styles.photo}
        contentFit="contain"
        contentPosition="center"
        accessibilityLabel="방송중인 방송이 없습니다"
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
