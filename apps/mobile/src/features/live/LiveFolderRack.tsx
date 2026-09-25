import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import {
  LIVE_FOLDER_RACK_HOLDER,
  LIVE_FOLDER_RACK_SLOTS,
  type LiveRackFolderDef,
} from "@/features/live/live-folder-rack-assets";
import type { MobileLiveCategoryId } from "@/features/live/live-categories";

const RACK_WIDTH = 118;

type Props = {
  activeCategory: MobileLiveCategoryId;
  onSelectCategory: (id: MobileLiveCategoryId) => void;
  maxHeight: number;
};

function RackFolderSlot({
  folder,
  rackHeight,
  active,
  onPress,
}: {
  folder: LiveRackFolderDef;
  rackHeight: number;
  active: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  const slotTop = (rackHeight * folder.topPct) / 100;
  const slotH = Math.max(1, (rackHeight * folder.heightPct) / 100);
  const raised = pressed || active;
  const lift = raised ? -slotH * 0.28 : 0;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={folder.a11yLabel}
      style={[
        styles.slotHit,
        {
          top: slotTop,
          height: slotH,
        },
      ]}
    >
      <View style={styles.pocket} pointerEvents="none">
        <View style={[styles.slide, { transform: [{ translateY: lift }] }]}>
          <Image source={folder.src} style={styles.folderImg} contentFit="contain" />
        </View>
      </View>
    </Pressable>
  );
}

/** Holder tray + tucked folders — mirrors web `LiveFolderRail`. */
export function LiveFolderRack({ activeCategory, onSelectCategory, maxHeight }: Props) {
  const rackHeight = maxHeight;
  const [measured, setMeasured] = useState(rackHeight);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) setMeasured(h);
  }, []);

  const slotScale = measured > 0 ? measured : rackHeight;

  return (
    <View style={[styles.rackOuter, { width: RACK_WIDTH, height: rackHeight }]}>
      <View style={[styles.rackInner, { height: rackHeight }]} onLayout={onLayout}>
        <Image
          source={LIVE_FOLDER_RACK_HOLDER}
          style={StyleSheet.absoluteFill}
          contentFit="fill"
          pointerEvents="none"
        />
        {LIVE_FOLDER_RACK_SLOTS.map((folder) => (
          <RackFolderSlot
            key={folder.categoryId}
            folder={folder}
            rackHeight={slotScale}
            active={activeCategory === folder.categoryId}
            onPress={() => onSelectCategory(folder.categoryId)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rackOuter: {
    alignSelf: "center",
    flexShrink: 0,
  },
  rackInner: {
    width: RACK_WIDTH,
    overflow: "visible",
  },
  slotHit: {
    position: "absolute",
    left: "8.5%",
    right: "8.5%",
    zIndex: 10,
  },
  pocket: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    overflow: "hidden",
  },
  slide: {
    position: "absolute",
    left: "1%",
    right: "1%",
    top: 0,
    width: "98%",
  },
  folderImg: {
    width: "100%",
    minHeight: 72,
  },
});
