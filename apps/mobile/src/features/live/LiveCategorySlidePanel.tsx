import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LiveFolderRack } from "@/features/live/LiveFolderRack";
import type { MobileLiveCategoryId } from "@/features/live/live-categories";

const OPEN_MS = 280;
const CLOSE_MS = 220;
const PANEL_W = 132;

type Props = {
  visible: boolean;
  activeCategory: MobileLiveCategoryId;
  onClose: () => void;
  onSelectCategory: (id: MobileLiveCategoryId) => void;
};

export function LiveCategorySlidePanel({
  visible,
  activeCategory,
  onClose,
  onSelectCategory,
}: Props) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [presented, setPresented] = useState(false);
  const slideX = useRef(new Animated.Value(PANEL_W)).current;

  const backdropOpacity = slideX.interpolate({
    inputRange: [0, PANEL_W],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const rackMaxHeight = Math.min(screenH - insets.top - insets.bottom - 88, 640);
  const allOn = activeCategory === "ALL";

  useEffect(() => {
    if (visible) {
      setPresented(true);
      slideX.setValue(PANEL_W);
      Animated.timing(slideX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }
    if (!presented) return;
    Animated.timing(slideX, {
      toValue: PANEL_W,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPresented(false);
    });
  }, [presented, slideX, visible]);

  if (!presented && !visible) return null;

  return (
    <Modal visible={presented} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.scrim, { opacity: backdropOpacity }]}
          pointerEvents={visible ? "auto" : "none"}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              width: PANEL_W,
              paddingTop: insets.top + 8,
              paddingBottom: insets.bottom + 8,
              transform: [{ translateX: slideX }],
            },
          ]}
        >
          <Pressable
            onPress={() => onSelectCategory("ALL")}
            style={[styles.allHit, allOn && styles.allHitOn]}
            accessibilityRole="button"
            accessibilityState={{ selected: allOn }}
            accessibilityLabel="전체"
          >
            <Text style={[styles.allText, allOn && styles.allTextOn]}>전체</Text>
            {allOn ? <View style={styles.catDot} /> : <View style={styles.catDotSpacer} />}
          </Pressable>

          <View style={styles.rackWrap}>
            <LiveFolderRack
              activeCategory={activeCategory}
              onSelectCategory={onSelectCategory}
              maxHeight={rackMaxHeight}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: "rgba(0,0,0,0.52)" },
  panel: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(250, 250, 252, 0.98)",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: -3, height: 0 },
    elevation: 12,
  },
  allHit: {
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 88,
    borderRadius: 14,
    marginBottom: 4,
  },
  allHitOn: {
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  allText: {
    fontSize: 16,
    fontWeight: "800",
    color: "rgba(0,0,0,0.38)",
    letterSpacing: -0.3,
  },
  allTextOn: {
    color: "#111111",
  },
  catDot: {
    marginTop: 4,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#C5522A",
  },
  catDotSpacer: {
    marginTop: 4,
    width: 5,
    height: 5,
  },
  rackWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
});
