import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

const BADGE = require("../../../assets/live-adult-19-badge.png");

type Props = {
  style?: StyleProp<ViewStyle>;
};

/** 19+ 성인 방송 썸네일 중앙 워터마크 */
export function LiveAdultWatermark({ style }: Props) {
  return (
    <View style={[styles.wrap, style]} pointerEvents="none">
      <Image source={BADGE} style={styles.badge} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

export function isLiveAdultItem(item: { isNsfw?: boolean; contentRating?: string | null }) {
  return item.isNsfw === true || item.contentRating === "ADULT";
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  badge: {
    width: "22%",
    minWidth: 52,
    maxWidth: 96,
    aspectRatio: 1,
  },
});
