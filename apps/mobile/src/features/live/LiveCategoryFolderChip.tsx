import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import {
  CATEGORY_FOLDER_IMAGE,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";

const FOLDER_SIZE = {
  chip: { w: 44, h: 52, labelTop: 10, fontSize: 6, lineHeight: 7 },
  rail: { w: 88, h: 104, labelTop: 18, fontSize: 9, lineHeight: 11 },
} as const;

type Props = {
  id: Exclude<MobileLiveCategoryId, "ALL">;
  label: string;
  active: boolean;
  size?: keyof typeof FOLDER_SIZE;
  onPress: () => void;
};

/** Compact folder chip for live chrome — white label centered on folder face. */
export function LiveCategoryFolderChip({ id, label, active, size = "chip", onPress }: Props) {
  const dim = FOLDER_SIZE[size];
  return (
    <Pressable
      onPress={onPress}
      style={[styles.hit, active && styles.hitOn]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      <View style={{ width: dim.w, height: dim.h }}>
        <Image
          source={CATEGORY_FOLDER_IMAGE[id]}
          style={{ width: dim.w, height: dim.h }}
          contentFit="contain"
        />
        <View
          style={[styles.labelWrap, { paddingTop: dim.labelTop }]}
          pointerEvents="none"
        >
          <Text
            style={[styles.label, { fontSize: dim.fontSize, lineHeight: dim.lineHeight }]}
            numberOfLines={1}
            allowFontScaling={false}
          >
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
    transform: [{ scale: 1.04 }],
  },
  /** Center on the folder body (below the tab). */
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 2,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: 0,
    textAlign: "center",
    includeFontPadding: false,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
