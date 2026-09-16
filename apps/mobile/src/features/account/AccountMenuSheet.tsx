import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import type { SavedMobileAccountPublic } from "@/auth/account-store";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddExisting: () => void;
  onLogout?: () => void;
};

const COLS = 2;
const ROWS = 3;
const GRID_SLOTS = COLS * ROWS;
const BOUNCE = Easing.bezier(0.34, 1.56, 0.64, 1);
const EMPTY_SLOT = require("../../../assets/account/empty-slot.png");

type GridItem =
  | { kind: "account"; account: SavedMobileAccountPublic }
  | { kind: "empty"; key: string };

function glyphOf(name: string | null | undefined, username: string) {
  const raw = (name || username || "?").trim();
  return raw.slice(0, 1);
}

/**
 * Account cartridge grid — transparent popup, always expanded 2×3.
 * Active cards show the registered profile photo; empty slots use the glass + asset as-is.
 */
export function AccountsBottomSheet({
  visible,
  onClose,
  onCreateNew,
  onAddExisting,
}: Props) {
  const { colors } = useTheme();
  const { user, savedAccounts, switchAccount, refreshSavedAccounts } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const accounts: SavedMobileAccountPublic[] = useMemo(() => {
    const map = new Map<string, SavedMobileAccountPublic>();
    for (const a of savedAccounts) map.set(a.userId, a);
    if (user && !map.has(user.id)) {
      map.set(user.id, {
        userId: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        savedAt: Date.now(),
      });
    }
    const list = [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
    if (!user?.id) return list;
    const active = list.find((a) => a.userId === user.id);
    if (!active) return list;
    return [active, ...list.filter((a) => a.userId !== user.id)];
  }, [savedAccounts, user]);

  const gridItems: GridItem[] = useMemo(() => {
    const capped = accounts.slice(0, GRID_SLOTS - 1);
    const items: GridItem[] = capped.map((account) => ({ kind: "account", account }));
    while (items.length < GRID_SLOTS) {
      items.push({ kind: "empty", key: `empty-${items.length}` });
    }
    return items;
  }, [accounts]);

  useEffect(() => {
    if (!visible) return;
    setError("");
    void refreshSavedAccounts();
  }, [refreshSavedAccounts, visible]);

  const stageW = Math.min(screenW - 48, 340);
  const cellGap = 12;
  const cellW = (stageW - cellGap) / COLS;
  const cellH = cellW * 1.28;
  const stageH = ROWS * cellH + (ROWS - 1) * cellGap;

  const pulseEmptyHaptic = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 70);
  }, []);

  const onEmptyPress = () => {
    pulseEmptyHaptic();
    Alert.alert("계정 추가", "어떤 작업을 할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "새 계정",
        onPress: () => {
          onClose();
          onCreateNew();
        },
      },
      {
        text: "계정 추가",
        onPress: () => {
          onClose();
          onAddExisting();
        },
      },
    ]);
  };

  const commitSwitch = useCallback(
    (userId: string) => {
      if (userId === user?.id) return;
      setBusy(true);
      setError("");
      void switchAccount(userId)
        .then(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onClose();
        })
        .catch(() => setError("계정을 전환할 수 없습니다."))
        .finally(() => setBusy(false));
    },
    [onClose, switchAccount, user?.id]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 18, paddingTop: insets.top + 24 },
          ]}
          pointerEvents="box-none"
        >
          <View style={[styles.stage, { height: stageH, width: stageW }]}>
            {gridItems.map((item, index) => (
              <CartridgeSlot
                key={item.kind === "account" ? item.account.userId : item.key}
                index={index}
                item={item}
                activeUserId={user?.id}
                cellW={cellW}
                cellH={cellH}
                cellGap={cellGap}
                busy={busy}
                onSelectAccount={commitSwitch}
                onEmptyPress={onEmptyPress}
              />
            ))}

            {busy ? (
              <View style={styles.busyOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : null}
          </View>

          {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

type SlotProps = {
  index: number;
  item: GridItem;
  activeUserId?: string;
  cellW: number;
  cellH: number;
  cellGap: number;
  busy: boolean;
  onSelectAccount: (userId: string) => void;
  onEmptyPress: () => void;
};

function CartridgeSlot({
  index,
  item,
  activeUserId,
  cellW,
  cellH,
  cellGap,
  busy,
  onSelectAccount,
  onEmptyPress,
}: SlotProps) {
  const ejectY = useSharedValue(0);
  const ejectScale = useSharedValue(1);
  const ejectRotate = useSharedValue(0);

  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const gridX = col * (cellW + cellGap);
  const gridY = row * (cellH + cellGap);

  const layoutStyle = useAnimatedStyle(() => ({
    zIndex: Math.round(10 + ejectY.value),
    transform: [
      { translateX: gridX },
      { translateY: gridY + ejectY.value },
      { scale: ejectScale.value },
      { rotate: `${ejectRotate.value}deg` },
    ],
  }));

  const runEjectInsert = (userId: string) => {
    if (busy) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    cancelAnimation(ejectY);
    cancelAnimation(ejectScale);
    cancelAnimation(ejectRotate);

    ejectY.value = withSequence(
      withTiming(-25, { duration: 220, easing: BOUNCE }),
      withTiming(0, { duration: 240, easing: BOUNCE }, (finished) => {
        if (finished) runOnJS(onSelectAccount)(userId);
      })
    );
    ejectScale.value = withSequence(
      withTiming(1.08, { duration: 220, easing: BOUNCE }),
      withTiming(1, { duration: 240, easing: BOUNCE })
    );
    ejectRotate.value = withSequence(
      withTiming(1.5, { duration: 90, easing: BOUNCE }),
      withTiming(-1.2, { duration: 110, easing: BOUNCE }),
      withTiming(0.6, { duration: 100, easing: BOUNCE }),
      withTiming(0, { duration: 160, easing: BOUNCE })
    );
  };

  if (item.kind === "empty") {
    return (
      <Animated.View style={[styles.slotAbs, { width: cellW, height: cellH }, layoutStyle]}>
        <Pressable
          style={styles.emptyHit}
          onPress={onEmptyPress}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="계정 추가"
        >
          <Image
            source={EMPTY_SLOT}
            style={styles.emptyImage}
            contentFit="cover"
            transition={0}
          />
        </Pressable>
      </Animated.View>
    );
  }

  const { account } = item;
  const isActive = account.userId === activeUserId;
  const glyph = glyphOf(account.name, account.username);
  const hasPhoto = Boolean(account.image);

  return (
    <Animated.View style={[styles.slotAbs, { width: cellW, height: cellH }, layoutStyle]}>
      <Pressable
        style={[styles.cartridgeCard, isActive && styles.cartridgeCardActive]}
        onPress={() => {
          if (isActive) return;
          runEjectInsert(account.userId);
        }}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={`${account.name || account.username} 계정으로 전환`}
      >
        {hasPhoto ? (
          <Image
            source={{ uri: account.image! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={account.image!}
            transition={0}
          />
        ) : (
          <View style={styles.glyphFallback}>
            <Text style={styles.glyphText}>{glyph}</Text>
          </View>
        )}

        <View style={styles.faceScrim} />
        <View style={styles.meta}>
          <Text style={styles.faceName} numberOfLines={1}>
            {account.name || account.username}
          </Text>
          <Text style={styles.faceHandle} numberOfLines={1}>
            @{account.username}
          </Text>
          {isActive ? <Text style={styles.activeTag}>현재</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center" },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    backgroundColor: "transparent",
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  stage: {
    alignSelf: "center",
    position: "relative",
  },
  slotAbs: {
    position: "absolute",
    left: 0,
    top: 0,
  },
  cartridgeCard: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#2A1812",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 110, 0.65)",
  },
  cartridgeCardActive: {
    borderColor: "rgba(255, 200, 120, 0.9)",
  },
  glyphFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#3A2218",
  },
  glyphText: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "900",
  },
  faceScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  meta: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 12,
  },
  faceName: { color: "#fff", fontSize: 14, fontWeight: "800" },
  faceHandle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  activeTag: {
    marginTop: 4,
    color: "#FFB86A",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyHit: { flex: 1 },
  emptyImage: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
  },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.28)",
    borderRadius: 18,
    zIndex: 50,
  },
  error: { fontWeight: "700", marginTop: 14, textAlign: "center" },
});
