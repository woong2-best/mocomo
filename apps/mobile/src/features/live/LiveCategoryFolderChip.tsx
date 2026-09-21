import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  CATEGORY_FOLDER_IMAGE,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";

/** Compact folder chips — user assets, scaled down from oversized rail. */
const FOLDER_W = 44;
const FOLDER_H = 52;

type Props = {
  id: Exclude<MobileLiveCategoryId, "ALL">;
  label: string;
  active: boolean;
  onPress: () => void;
};

/** Compact folder chip for live chrome — white label centered on folder face. */
export function LiveCategoryFolderChip({ id, label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.hit, active && styles.hitOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={styles.folder}>
        <Image
          source={CATEGORY_FOLDER_IMAGE[id]}
          style={styles.img}
          contentFit="contain"
        />
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={styles.label} numberOfLines={1} allowFontScaling={false}>
            {label}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    opacity: 0.88,
  },
  hitOn: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  folder: {
    width: FOLDER_W,
    height: FOLDER_H,
  },
  img: {
    ...StyleSheet.absoluteFillObject,
    width: FOLDER_W,
    height: FOLDER_H,
  },
  /** Center on the folder body (below the tab). */
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 2,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 6,
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    lineHeight: 7,
  },
});
