import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withTiming,
  ZoomIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_BASE_URL } from "@/config/env";
import { useAuth } from "@/auth/AuthContext";
import {
  reorderSavedAccounts,
  type SavedMobileAccountPublic,
} from "@/auth/account-store";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
import { useTheme } from "@/theme/ThemeContext";
import { AccountAddChoiceDialog } from "@/features/account/AccountAddChoiceDialog";

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
const GAP = 14;
/** Switch game card aspect ≈ 21:35 (portrait cartridge). */
const CARD_RATIO = 35 / 21;
const H_PAD = 40;
const STAGE_MAX = 340;
const EXIT_MS = 220;
const PRESS_SPRING = { damping: 22, stiffness: 520, mass: 0.45 };
const APPLE_SPRING = { damping: 18, stiffness: 220, mass: 0.85 };
const SHELL = "#0C0C0E";
const SHELL_EDGE = "#2A2A30";
const BAY = "#121214";
const ACTIVE_LAMP = "#3DDC84";
const LOGOUT_FILL = "#C04A26";

const BG_DARK = require("../../../assets/account/dark-bg.png");
const BG_LIGHT = require("../../../assets/account/light-bg.png");

type GridItem =
  | { kind: "account"; key: string; account: SavedMobileAccountPublic }
  | { kind: "empty"; key: string };

function glyphOf(name: string | null | undefined, username: string) {
  return (name || username || "?").trim().slice(0, 1).toUpperCase();
}

function resolveMediaUri(uri: string | null | undefined): string | null {
  if (!uri) return null;
  const t = uri.trim();
  if (!t) return null;
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("file:") ||
    t.startsWith("content:") ||
    t.startsWith("data:")
  ) {
    return t;
  }
  if (t.startsWith("/")) return `${API_BASE_URL.replace(/\/$/, "")}${t}`;
  return t;
}

/**
 * Nintendo Switch game-card account switcher — flex 2×3 grid (no absolute pile-up).
 * Long-press a non-active card, then tap another to swap positions.
 */
/** Nintendo Switch–style cartridge grid — preserved for Games Hub / future use. */
export function AccountsCartridgeSheet({
  visible,
  onClose,
  onCreateNew,
  onAddExisting,
  onLogout,
}: Props) {
  const { colors, isDark } = useTheme();
  const { user, savedAccounts, switchAccount, refreshSavedAccounts } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(visible);
  const [orderIds, setOrderIds] = useState<string[]>([]);
  /** Long-press selected card waiting to swap with another. */
  const [swapFrom, setSwapFrom] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const progress = useSharedValue(0);
  const bgAsset = isDark ? BG_DARK : BG_LIGHT;

  const accounts = useMemo(() => {
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
    if (user?.id && user.image) {
      const cur = map.get(user.id);
      if (cur) map.set(user.id, { ...cur, image: user.image });
    }
    return [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
  }, [savedAccounts, user]);

  useEffect(() => {
    if (swapFrom) return;
    const ids = accounts.slice(0, GRID_SLOTS - 1).map((a) => a.userId);
    setOrderIds(ids);
  }, [accounts, swapFrom, visible]);

  const gridItems: GridItem[] = useMemo(() => {
    const byId = new Map(accounts.map((a) => [a.userId, a]));
    const ordered = orderIds
      .map((id) => byId.get(id))
      .filter((a): a is SavedMobileAccountPublic => !!a);
    const items: GridItem[] = ordered.map((account) => ({
      kind: "account",
      key: account.userId,
      account,
    }));
    let emptyN = 0;
    while (items.length < GRID_SLOTS) {
      items.push({ kind: "empty", key: `empty-${emptyN++}` });
    }
    return items;
  }, [accounts, orderIds]);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setError("");
      setSwapFrom(null);
      setAddOpen(false);
      void refreshSavedAccounts();
      progress.value = 0;
      progress.value = withSpring(1, APPLE_SPRING);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    progress.value = withTiming(0, { duration: EXIT_MS, easing: Easing.out(Easing.cubic) }, (done) => {
      if (done) runOnJS(setMounted)(false);
    });
  }, [visible, progress, refreshSavedAccounts]);

  const requestClose = useCallback(() => {
    if (!visible) return;
    if (swapFrom) {
      setSwapFrom(null);
      return;
    }
    void Haptics.selectionAsync();
    onClose();
  }, [onClose, visible, swapFrom]);

  const stageW = Math.min(screenW - H_PAD, STAGE_MAX);
  const cellW = Math.floor((stageW - GAP) / COLS);
  const cellH = Math.round(cellW * CARD_RATIO);
  const exactStageW = COLS * cellW + (COLS - 1) * GAP;

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35, 1], [0, 1, 1]),
  }));

  const onEmptyPress = useCallback(() => {
    if (swapFrom) {
      setSwapFrom(null);
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddOpen(true);
  }, [swapFrom]);

  const commitSwitch = useCallback(
    (userId: string) => {
      if (userId === user?.id) return;
      setBusy(true);
      setError("");
      void switchAccount(userId)
        .then(() => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onClose();
        })
        .catch(() => setError("계정을 전환할 수 없습니다."))
        .finally(() => setBusy(false));
    },
    [onClose, switchAccount, user?.id]
  );

  const handleLogout = useCallback(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onClose();
    onLogout?.();
  }, [onClose, onLogout]);

  const persistOrder = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      void reorderSavedAccounts(ids)
        .then(() => refreshSavedAccounts())
        .catch(() => undefined);
    },
    [refreshSavedAccounts]
  );

  const swapAccounts = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      setOrderIds((prev) => {
        const next = prev.slice();
        const a = next.indexOf(fromId);
        const b = next.indexOf(toId);
        if (a < 0 || b < 0) return prev;
        const tmp = next[a]!;
        next[a] = next[b]!;
        next[b] = tmp;
        persistOrder(next);
        return next;
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSwapFrom(null);
    },
    [persistOrder]
  );

  const onCardPress = useCallback(
    (userId: string, isActive: boolean) => {
      if (busy) return;
      if (swapFrom) {
        if (userId === swapFrom) {
          setSwapFrom(null);
          return;
        }
        if (isActive) {
          setSwapFrom(null);
          return;
        }
        swapAccounts(swapFrom, userId);
        return;
      }
      if (!isActive) commitSwitch(userId);
    },
    [busy, commitSwitch, swapAccounts, swapFrom]
  );

  const onCardLongPress = useCallback(
    (userId: string, isActive: boolean) => {
      if (busy || isActive) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSwapFrom(userId);
    },
    [busy]
  );

  if (!mounted) return null;

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <GestureHandlerRootView style={[styles.overlay, { width: screenW, height: screenH }]}>
        <Animated.View style={[styles.backdrop, backdropStyle]} pointerEvents="none" collapsable={false}>
          <Image
            source={bgAsset}
            style={styles.backdropImage}
            contentFit="cover"
            transition={0}
            cachePolicy={IMAGE_CACHE_POLICY}
          />
          <View style={styles.backdropDim} />
        </Animated.View>

        <Pressable
          style={styles.dismissHit}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel="계정 슬롯 닫기"
        />

        <View
          style={[
            styles.stageHost,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 },
          ]}
          pointerEvents="box-none"
          collapsable={false}
        >
          <Text style={styles.trayTitle}>ACCOUNT CARDS</Text>
          <Text style={styles.trayHint}>
            {swapFrom
              ? "위치를 바꿀 다른 카드를 탭하세요"
              : "길게 눌러 카드 위치를 바꿀 수 있어요"}
          </Text>

          <View style={[styles.stage, { width: exactStageW, gap: GAP }]} collapsable={false}>
            {gridItems.map((item, index) => {
              const delay = 30 + index * 24;
              const selected = item.kind === "account" && swapFrom === item.account.userId;
              const swapTarget =
                !!swapFrom &&
                item.kind === "account" &&
                item.account.userId !== swapFrom &&
                item.account.userId !== user?.id;

              return (
                <Animated.View
                  key={item.key}
                  entering={ZoomIn.springify().damping(16).stiffness(220).delay(delay).mass(0.75)}
                  style={[
                    styles.cell,
                    { width: cellW, height: cellH },
                    selected && styles.cellSelected,
                    swapTarget && styles.cellTarget,
                  ]}
                  collapsable={false}
                >
                  {item.kind === "empty" ? (
                    <EmptyCartridgeSlot busy={busy} onPress={onEmptyPress} />
                  ) : (
                    <SwitchCartridge
                      account={item.account}
                      isActive={item.account.userId === user?.id}
                      busy={busy}
                      selected={selected}
                      onPress={() =>
                        onCardPress(item.account.userId, item.account.userId === user?.id)
                      }
                      onLongPress={() =>
                        onCardLongPress(item.account.userId, item.account.userId === user?.id)
                      }
                      onLogout={handleLogout}
                    />
                  )}
                </Animated.View>
              );
            })}
          </View>

          {busy ? (
            <Animated.View entering={FadeIn.duration(150)} style={styles.busyChip} pointerEvents="none">
              <ActivityIndicator color="#fff" />
            </Animated.View>
          ) : null}
          {error ? (
            <Animated.View entering={FadeIn} exiting={FadeOut}>
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            </Animated.View>
          ) : null}
        </View>

        <AccountAddChoiceDialog
          visible={addOpen}
          onClose={() => setAddOpen(false)}
          onCreateNew={() => {
            setAddOpen(false);
            onClose();
            onCreateNew();
          }}
          onAddExisting={() => {
            setAddOpen(false);
            onClose();
            onAddExisting();
          }}
          embedded
        />
      </GestureHandlerRootView>
    </Modal>
  );
}

function useInsertPress() {
  const press = useSharedValue(0);

  const sink = useCallback(() => {
    press.value = withSpring(1, PRESS_SPRING);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [press]);

  const rise = useCallback(() => {
    press.value = withSpring(0, { damping: 16, stiffness: 280, mass: 0.55 });
  }, [press]);

  const shellStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(press.value, [0, 1], [0, 5]) },
      { scale: interpolate(press.value, [0, 1], [1, 0.97]) },
    ],
  }));

  return { sink, rise, shellStyle };
}

function EmptyCartridgeSlot({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const { sink, rise, shellStyle } = useInsertPress();

  return (
    <Pressable
      style={styles.fill}
      disabled={busy}
      onPressIn={sink}
      onPressOut={rise}
      onPress={() => {
        rise();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="계정 추가"
    >
      <Animated.View style={[styles.emptyBay, shellStyle]}>
        <View style={styles.emptyInner}>
          <View style={styles.emptyPlusRing}>
            <Ionicons name="add" size={28} color="rgba(120,220,255,0.9)" />
          </View>
          <Text style={styles.emptyLabel}>INSERT CARD</Text>
          <Text style={styles.emptySub}>+ NEW ACCOUNT</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

function LogoutFooter({ busy, onPress }: { busy: boolean; onPress: () => void }) {
  const press = useSharedValue(0);

  const sink = useCallback(() => {
    press.value = withSpring(1, PRESS_SPRING);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [press]);

  const rise = useCallback(() => {
    press.value = withSpring(0, { damping: 16, stiffness: 280, mass: 0.55 });
  }, [press]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.97]) }],
  }));

  const insetStyle = useAnimatedStyle(() => ({
    opacity: interpolate(press.value, [0, 1], [0, 1]),
  }));

  return (
    <Pressable
      style={styles.logoutHit}
      disabled={busy}
      onPressIn={sink}
      onPressOut={rise}
      onPress={() => {
        rise();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel="로그아웃"
    >
      <Animated.View style={[styles.logoutBtn, pressStyle]}>
        <Animated.View style={[styles.logoutInset, insetStyle]} pointerEvents="none" />
        <Ionicons name="log-out-outline" size={12} color="#fff" />
        <Text style={styles.logoutLabel}>로그아웃</Text>
        <View style={styles.logoutRim} pointerEvents="none" />
      </Animated.View>
    </Pressable>
  );
}

function SwitchCartridge({
  account,
  isActive,
  busy,
  selected,
  onPress,
  onLongPress,
  onLogout,
}: {
  account: SavedMobileAccountPublic;
  isActive: boolean;
  busy: boolean;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onLogout: () => void;
}) {
  const { sink, rise, shellStyle } = useInsertPress();
  const ejectY = useSharedValue(0);
  const [imgFailed, setImgFailed] = useState(false);
  const photoUri = resolveMediaUri(account.image);
  const showPhoto = Boolean(photoUri) && !imgFailed;
  const glyph = glyphOf(account.name, account.username);
  const display = account.name || account.username;

  const ejectStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ejectY.value }],
  }));

  const handlePress = () => {
    if (busy) return;
    if (isActive) {
      onPress();
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    ejectY.value = withSequence(
      withTiming(-8, { duration: 100 }),
      withTiming(5, { duration: 90 }),
      withTiming(0, { duration: 120 }, (done) => {
        if (done) runOnJS(onPress)();
      })
    );
  };

  return (
    <Animated.View style={[styles.fill, shellStyle]}>
      <Animated.View style={[styles.fill, ejectStyle]}>
        <View style={[styles.cartridge, selected && styles.cartridgeSelected]}>
          <View style={styles.shellBody} pointerEvents="none">
            <LinearGradient
              colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0)", "rgba(0,0,0,0.35)"]}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <Pressable
            style={[styles.cardBody, isActive && styles.cardBodyActive]}
            onPressIn={sink}
            onPressOut={rise}
            onPress={handlePress}
            onLongPress={onLongPress}
            delayLongPress={220}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={
              isActive ? `${display} 현재 계정` : `${display} 계정으로 전환`
            }
          >
            <View style={styles.coverArt}>
              {showPhoto ? (
                <Image
                  source={{ uri: photoUri! }}
                  style={styles.coverImage}
                  contentFit="cover"
                  cachePolicy={IMAGE_CACHE_POLICY}
                  recyclingKey={photoUri!}
                  transition={0}
                  onError={() => setImgFailed(true)}
                />
              ) : (
                <View style={styles.glyphFallback}>
                  <Text style={styles.glyphText}>{glyph}</Text>
                </View>
              )}
            </View>
            <Text style={styles.cardName} numberOfLines={1}>
              {display}
            </Text>
            <Text style={styles.cardHandle} numberOfLines={1}>
              @{account.username}
            </Text>
            {isActive ? (
              <View style={styles.activeBadge}>
                <View style={styles.activeLamp} />
                <Text style={styles.activeText}>INSERTED</Text>
              </View>
            ) : (
              <View style={styles.idleBadge}>
                <Text style={styles.idleText}>READY</Text>
              </View>
            )}
          </Pressable>

          {isActive ? <LogoutFooter busy={busy} onPress={onLogout} /> : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    zIndex: 999,
    elevation: 999,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 1,
  },
  backdropImage: {
    ...StyleSheet.absoluteFill,
    width: "100%",
    height: "100%",
  },
  backdropDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  dismissHit: {
    ...StyleSheet.absoluteFill,
    zIndex: 2,
  },
  stageHost: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  trayTitle: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 2.4,
    marginBottom: 4,
  },
  trayHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  stage: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    overflow: "visible",
  },
  cellSelected: {
    transform: [{ scale: 1.05 }],
    zIndex: 4,
  },
  cellTarget: {
    opacity: 0.92,
  },
  fill: {
    flex: 1,
    width: "100%",
    height: "100%",
  },

  emptyBay: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: BAY,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.14)",
    borderStyle: "dashed",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    shadowOpacity: 0.35,
    elevation: 4,
  },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  emptyPlusRing: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(120,220,255,0.45)",
    backgroundColor: "rgba(80,180,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyLabel: {
    color: "rgba(160,220,255,0.95)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  emptySub: {
    marginTop: 4,
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "700",
  },

  cartridge: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: SHELL,
    borderWidth: 1,
    borderColor: SHELL_EDGE,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
    elevation: 8,
  },
  cartridgeSelected: {
    borderColor: "rgba(120,200,255,0.85)",
    borderWidth: 2,
  },
  shellBody: {
    ...StyleSheet.absoluteFill,
    backgroundColor: SHELL,
  },
  cardBody: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 8,
    alignItems: "center",
    minHeight: 0,
  },
  cardBodyActive: {
    paddingBottom: 6,
  },
  coverArt: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: "58%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#1A1A1E",
    marginBottom: 8,
    flexShrink: 1,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  glyphFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#25252C",
  },
  glyphText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "900",
  },
  cardName: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    width: "100%",
    textAlign: "center",
  },
  cardHandle: {
    marginTop: 3,
    color: "rgba(255,255,255,0.55)",
    fontSize: 11,
    fontWeight: "600",
    width: "100%",
    textAlign: "center",
  },
  activeBadge: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(61,220,132,0.12)",
    borderWidth: 1,
    borderColor: "rgba(61,220,132,0.55)",
  },
  activeLamp: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ACTIVE_LAMP,
  },
  activeText: {
    color: ACTIVE_LAMP,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.9,
  },
  idleBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  idleText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  logoutHit: {
    height: 28,
  },
  logoutBtn: {
    flex: 1,
    height: 28,
    borderRadius: 0,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: LOGOUT_FILL,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    overflow: "hidden",
  },
  logoutInset: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.22)",
  },
  logoutLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  logoutRim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 1.5,
    backgroundColor: "rgba(232, 168, 72, 0.55)",
  },

  busyChip: {
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  error: {
    marginTop: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
