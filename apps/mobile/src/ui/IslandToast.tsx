import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IslandKind = "success" | "error" | "info";

type IslandAction = {
  label: string;
  onPress: () => void;
};

type IslandPayload = {
  id: number;
  title: string;
  message?: string;
  kind: IslandKind;
  durationMs: number;
  action?: IslandAction;
};

type Listener = (payload: IslandPayload | null) => void;

let nextId = 1;
const listeners = new Set<Listener>();
let current: IslandPayload | null = null;

function hapticForKind(kind: IslandKind) {
  if (kind === "error") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } else if (kind === "success") {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

function emit(payload: IslandPayload | null) {
  if (payload) hapticForKind(payload.kind);
  current = payload;
  for (const l of listeners) l(payload);
}

/** Top Dynamic-Island pill — use instead of Android Alert for lightweight feedback. */
export function showIslandToast(
  title: string,
  message?: string,
  opts?: { kind?: IslandKind; durationMs?: number }
) {
  emit({
    id: nextId++,
    title,
    message,
    kind: opts?.kind ?? "success",
    durationMs: opts?.durationMs ?? 2800,
  });
}

export function showIslandError(title: string, message?: string) {
  const durationMs = message && message.length > 48 ? 4800 : 3600;
  showIslandToast(title, message, { kind: "error", durationMs });
}

export function showIslandSuccess(title: string, message?: string) {
  showIslandToast(title, message, { kind: "success" });
}

export function showIslandInfo(title: string, message?: string) {
  showIslandToast(title, message, { kind: "info", durationMs: 3200 });
}

/** Top notice with optional action — replaces Alert.alert with buttons. */
export function showIslandPrompt(
  title: string,
  message: string | undefined,
  action: IslandAction,
  opts?: { kind?: IslandKind; durationMs?: number }
) {
  const kind = opts?.kind ?? "info";
  const durationMs =
    opts?.durationMs ?? (message && message.length > 48 ? 7200 : 5600);
  emit({
    id: nextId++,
    title,
    message,
    kind,
    durationMs,
    action,
  });
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (current) listener(current);
  return () => {
    listeners.delete(listener);
  };
}

type SlotListener = (active: boolean) => void;
let screenSlotActive = false;
const screenSlotListeners = new Set<SlotListener>();

function setScreenSlotActive(active: boolean) {
  if (screenSlotActive === active) return;
  screenSlotActive = active;
  for (const l of screenSlotListeners) l(active);
}

function useScreenSlotSupersedesHost() {
  const [supersedes, setSupersedes] = useState(screenSlotActive);
  useEffect(() => {
    const onChange = (active: boolean) => setSupersedes(active);
    screenSlotListeners.add(onChange);
    return () => {
      screenSlotListeners.delete(onChange);
    };
  }, []);
  return supersedes;
}

const SPRING = { damping: 16, stiffness: 280, mass: 0.8 };
const PILL_BG = "#1E2B5A";
const ICON_DISK = "rgba(126, 140, 200, 0.35)";
const MARK_BG = "#7E8CC8";

/**
 * Renders the island pill on the focused screen (stack modals on Android).
 * Passes scroll/touch through everywhere except the pill.
 */
export function IslandToastScreenSlot() {
  const focused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      setScreenSlotActive(true);
      return () => setScreenSlotActive(false);
    }, [])
  );

  if (!focused) return null;
  return <IslandToastPresenter placement="screen" />;
}

/**
 * MoCoMo island toast — matches web published pill / Dynamic Island motion.
 * App-level host; defers to IslandToastScreenSlot on focused screens (incl. modals).
 */
export function IslandToastHost() {
  const supersedes = useScreenSlotSupersedesHost();
  if (supersedes) return null;
  return <IslandToastPresenter placement="app" />;
}

type PresenterPlacement = "app" | "screen";

function IslandToastPresenter({ placement }: { placement: PresenterPlacement }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<IslandPayload | null>(null);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const finishHide = useCallback(() => {
    setMounted(false);
    setToast(null);
  }, []);

  const dismiss = useCallback(() => {
    clearHideTimer();
    progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishHide)();
    });
    emit(null);
  }, [clearHideTimer, finishHide, progress]);

  const runAction = useCallback(() => {
    const fn = toast?.action?.onPress;
    dismiss();
    fn?.();
  }, [dismiss, toast?.action]);

  useEffect(() => {
    return subscribe((payload) => {
      clearHideTimer();
      if (!payload) {
        progress.value = withTiming(0, { duration: 200 }, (done) => {
          if (done) runOnJS(finishHide)();
        });
        return;
      }
      setToast(payload);
      setMounted(true);
      progress.value = 0;
      progress.value = withSpring(1, SPRING);
      hideTimer.current = setTimeout(() => {
        progress.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(finishHide)();
        });
        emit(null);
      }, payload.durationMs);
    });
  }, [clearHideTimer, finishHide, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -36 },
      { scaleX: 0.55 + progress.value * 0.45 },
      { scaleY: 0.72 + progress.value * 0.28 },
    ],
  }));

  const chrome = useMemo(() => {
    const kind = toast?.kind ?? "success";
    if (kind === "error") {
      return { icon: "alert-circle" as const, iconColor: "#FF8A80" };
    }
    if (kind === "info") {
      return { icon: "information-circle" as const, iconColor: "#FFFFFF" };
    }
    return { icon: "cloud-upload-outline" as const, iconColor: "#FFFFFF" };
  }, [toast?.kind]);

  if (!mounted || !toast) return null;

  const a11y = toast.message ? `${toast.title}. ${toast.message}` : toast.title;
  const topInset = placement === "app" ? Math.max(insets.top, 12) + 4 : 4;

  const pill = (
    <View pointerEvents="box-none" style={[styles.host, { paddingTop: topInset }]}>
      <Animated.View pointerEvents="box-none" style={[styles.pillWrap, animStyle]}>
        <View style={styles.pill} pointerEvents="box-none">
          <Pressable
            onPress={dismiss}
            style={styles.pillMain}
            accessibilityRole="button"
            accessibilityLabel={a11y}
          >
            <View style={styles.iconDisk}>
              <Ionicons name={chrome.icon} size={18} color={chrome.iconColor} />
            </View>
            <View style={styles.mark}>
              <Text style={styles.markText}>M</Text>
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title} numberOfLines={1}>
                {toast.title}
              </Text>
              {toast.message ? (
                <Text style={styles.message} numberOfLines={toast.kind === "error" ? 3 : 2}>
                  {toast.message}
                </Text>
              ) : null}
            </View>
            {!toast.action ? (
              <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.85)" />
            ) : null}
          </Pressable>
          {toast.action ? (
            <Pressable
              onPress={runAction}
              hitSlop={8}
              style={styles.actionChip}
              accessibilityRole="button"
              accessibilityLabel={toast.action.label}
            >
              <Text style={styles.actionText} numberOfLines={1}>
                {toast.action.label}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.topLayer} pointerEvents="box-none">
      {pill}
    </View>
  );
}

const styles = StyleSheet.create({
  topLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
  },
  host: {
    alignItems: "center",
  },
  pillWrap: {
    maxWidth: 380,
    width: "88%",
  },
  pill: {
    minHeight: 54,
    borderRadius: 999,
    backgroundColor: PILL_BG,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  pillMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  iconDisk: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ICON_DISK,
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: MARK_BG,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 14,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  message: {
    marginTop: 1,
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "600",
  },
  actionChip: {
    maxWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});
