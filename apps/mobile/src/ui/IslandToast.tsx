import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IslandKind = "success" | "error" | "info";

type IslandPayload = {
  id: number;
  title: string;
  message?: string;
  kind: IslandKind;
  durationMs: number;
};

type Listener = (payload: IslandPayload | null) => void;

let nextId = 1;
const listeners = new Set<Listener>();
let current: IslandPayload | null = null;

function emit(payload: IslandPayload | null) {
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
  showIslandToast(title, message, { kind: "error", durationMs: 3600 });
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  if (current) listener(current);
  return () => {
    listeners.delete(listener);
  };
}

const SPRING = { damping: 16, stiffness: 280, mass: 0.8 };
const PILL_BG = "#1E2B5A";
const ICON_DISK = "rgba(126, 140, 200, 0.35)";
const MARK_BG = "#7E8CC8";

/**
 * MoCoMo island toast — matches web published pill / Dynamic Island motion.
 * Rendered in its own Modal so it sits above native stack screens on Android.
 */
export function IslandToastHost() {
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

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={dismiss}
    >
      <View pointerEvents="box-none" style={styles.modalRoot}>
        <View pointerEvents="box-none" style={[styles.host, { paddingTop: Math.max(insets.top, 12) + 4 }]}>
          <Animated.View style={[styles.pillWrap, animStyle]}>
            <Pressable
              onPress={dismiss}
              style={styles.pill}
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
                  <Text style={styles.message} numberOfLines={1}>
                    {toast.message}
                  </Text>
                ) : null}
              </View>
              <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
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
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
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
});
