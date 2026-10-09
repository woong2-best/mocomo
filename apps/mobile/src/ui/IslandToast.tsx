import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, StatusBar, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type IslandKind = "success" | "error" | "info" | "warning";

type IslandAction = {
  label: string;
  onPress: () => void;
};

type IslandToastOpts = {
  kind?: IslandKind;
  durationMs?: number;
  action?: IslandAction;
  /** Keep the ··· affordance and run `action` when it is pressed. */
  actionAsEllipsis?: boolean;
  hideIcon?: boolean;
  hideMark?: boolean;
  hideTitle?: boolean;
};

type IslandPayload = {
  id: number;
  title: string;
  message?: string;
  kind: IslandKind;
  durationMs: number;
  action?: IslandAction;
  actionAsEllipsis?: boolean;
  hideIcon?: boolean;
  hideMark?: boolean;
  hideTitle?: boolean;
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
  opts?: IslandToastOpts
) {
  emit({
    id: nextId++,
    title,
    message,
    kind: opts?.kind ?? "success",
    durationMs: opts?.durationMs ?? 2800,
    action: opts?.action,
    actionAsEllipsis: opts?.actionAsEllipsis,
    hideIcon: opts?.hideIcon,
    hideMark: opts?.hideMark,
    hideTitle: opts?.hideTitle,
  });
}

/** Persistent warning pill — message only, optional ··· action. */
export function showIslandWarning(
  message: string,
  opts?: {
    action?: IslandAction;
    durationMs?: number;
  }
) {
  emit({
    id: nextId++,
    title: "",
    message,
    kind: "warning",
    durationMs: opts?.durationMs ?? 0,
    action: opts?.action,
    actionAsEllipsis: !!opts?.action,
    hideIcon: true,
    hideMark: true,
    hideTitle: true,
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
  opts?: IslandToastOpts
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
    actionAsEllipsis: opts?.actionAsEllipsis,
    hideIcon: opts?.hideIcon,
    hideMark: opts?.hideMark,
    hideTitle: opts?.hideTitle,
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

/** Clear the status bar, then a small gap so the pill does not sit on system icons. */
function toastTopInset(safeTop: number) {
  const androidBar = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;
  return Math.max(safeTop, androidBar, 12) + 12;
}

const SPRING = { damping: 16, stiffness: 280, mass: 0.8 };
const SWIPE_BACK = { damping: 20, stiffness: 340, mass: 0.65 };
const SWIPE_ARM_PX = 12;
const SWIPE_DISMISS_PX = 72;
const SWIPE_DISMISS_VELOCITY = 750;
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
  return <IslandToastPresenter />;
}

/**
 * MoCoMo island toast — matches web published pill / Dynamic Island motion.
 * App-level host; defers to IslandToastScreenSlot on focused screens (incl. modals).
 */
export function IslandToastHost() {
  const supersedes = useScreenSlotSupersedesHost();
  if (supersedes) return null;
  return <IslandToastPresenter />;
}

function IslandToastPresenter() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [toast, setToast] = useState<IslandPayload | null>(null);
  const [mounted, setMounted] = useState(false);
  const progress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const swipeOpacity = useSharedValue(1);
  const screenWidth = useSharedValue(windowWidth);
  const toastId = useSharedValue(0);
  const dragged = useSharedValue(0);
  const swipeSettled = useSharedValue(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleId = useRef<number | null>(null);
  const swipeDismissing = useRef(false);
  const durationRef = useRef(2800);
  const draggedRef = useRef(false);

  useEffect(() => {
    screenWidth.value = windowWidth;
  }, [screenWidth, windowWidth]);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const finishHide = useCallback(() => {
    swipeDismissing.current = false;
    visibleId.current = null;
    draggedRef.current = false;
    setMounted(false);
    setToast(null);
  }, []);

  const armHide = useCallback(
    (ms: number) => {
      clearHideTimer();
      if (ms <= 0) return;
      hideTimer.current = setTimeout(() => {
        progress.value = withTiming(0, { duration: 240, easing: Easing.in(Easing.cubic) }, (done) => {
          if (done) runOnJS(finishHide)();
        });
        emit(null);
      }, ms);
    },
    [clearHideTimer, finishHide, progress]
  );

  const dismiss = useCallback(() => {
    clearHideTimer();
    progress.value = withTiming(0, { duration: 220, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) runOnJS(finishHide)();
    });
    emit(null);
  }, [clearHideTimer, finishHide, progress]);

  const runAction = useCallback(() => {
    if (draggedRef.current || dragged.value === 1) {
      draggedRef.current = false;
      dragged.value = 0;
      return;
    }
    const fn = toast?.action?.onPress;
    dismiss();
    fn?.();
  }, [dismiss, dragged, toast?.action]);

  const onSwipeStart = useCallback(() => {
    clearHideTimer();
  }, [clearHideTimer]);

  const markDragged = useCallback(() => {
    draggedRef.current = true;
  }, []);

  const resumeHide = useCallback(() => {
    if (swipeDismissing.current || visibleId.current == null) return;
    if (durationRef.current <= 0) {
      setTimeout(() => {
        draggedRef.current = false;
        dragged.value = 0;
      }, 80);
      return;
    }
    const ms = Math.min(Math.max(durationRef.current, 1800), 4000);
    armHide(ms);
    setTimeout(() => {
      draggedRef.current = false;
      dragged.value = 0;
    }, 80);
  }, [armHide, dragged]);

  const markSwipeDismiss = useCallback(
    (id: number) => {
      if (visibleId.current !== id) return;
      swipeDismissing.current = true;
      clearHideTimer();
      emit(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [clearHideTimer]
  );

  const finishSwipeHide = useCallback(
    (id: number) => {
      if (visibleId.current !== id) return;
      finishHide();
    },
    [finishHide]
  );

  const gestureApi = useRef({
    onSwipeStart,
    markDragged,
    resumeHide,
    markSwipeDismiss,
    finishSwipeHide,
    dismiss,
    runAction,
  });
  gestureApi.current = {
    onSwipeStart,
    markDragged,
    resumeHide,
    markSwipeDismiss,
    finishSwipeHide,
    dismiss,
    runAction,
  };

  const onSwipeStartJs = useCallback(() => {
    gestureApi.current.onSwipeStart();
  }, []);
  const markDraggedJs = useCallback(() => {
    gestureApi.current.markDragged();
  }, []);
  const resumeHideJs = useCallback(() => {
    gestureApi.current.resumeHide();
  }, []);
  const markSwipeDismissJs = useCallback((id: number) => {
    gestureApi.current.markSwipeDismiss(id);
  }, []);
  const finishSwipeHideJs = useCallback((id: number) => {
    gestureApi.current.finishSwipeHide(id);
  }, []);
  const onTapDismissJs = useCallback(() => {
    if (draggedRef.current) return;
    gestureApi.current.dismiss();
  }, []);
  const onActionJs = useCallback(() => {
    gestureApi.current.runAction();
  }, []);

  const tap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(18)
        .onEnd((_event, success) => {
          if (success) runOnJS(onTapDismissJs)();
        }),
    [onTapDismissJs]
  );

  const actionTap = useMemo(
    () =>
      Gesture.Tap()
        .maxDistance(18)
        .onEnd((_event, success) => {
          if (success) runOnJS(onActionJs)();
        }),
    [onActionJs]
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .maxPointers(1)
        .activeOffsetX([-SWIPE_ARM_PX, SWIPE_ARM_PX])
        .failOffsetY([-28, 28])
        .blocksExternalGesture(tap, actionTap)
        .onStart((event) => {
          swipeSettled.value = 0;
          dragged.value = 0;
          translateX.value = event.translationX;
          cancelAnimation(progress);
          progress.value = 1;
          runOnJS(onSwipeStartJs)();
        })
        .onUpdate((event) => {
          translateX.value = event.translationX;
          swipeOpacity.value = interpolate(
            Math.abs(event.translationX),
            [0, screenWidth.value * 0.42, screenWidth.value * 0.9],
            [1, 0.94, 0.15],
            Extrapolation.CLAMP
          );
          if (dragged.value === 0 && Math.abs(event.translationX) > 8) {
            dragged.value = 1;
            runOnJS(markDraggedJs)();
          }
        })
        .onEnd((event, success) => {
          if (swipeSettled.value === 1) return;
          swipeSettled.value = 1;
          const travel = event.translationX + event.velocityX * 0.12;
          const shouldDismiss =
            success &&
            (Math.abs(travel) > SWIPE_DISMISS_PX || Math.abs(event.velocityX) > SWIPE_DISMISS_VELOCITY);
          if (!shouldDismiss) {
            translateX.value = withSpring(0, SWIPE_BACK);
            swipeOpacity.value = withTiming(1, { duration: 160 });
            runOnJS(resumeHideJs)();
            return;
          }
          const dir = travel >= 0 ? 1 : -1;
          const target = dir * (screenWidth.value + 96);
          const dist = Math.abs(target - translateX.value);
          const speed = Math.max(Math.abs(event.velocityX), 1100);
          const duration = Math.min(280, Math.max(140, (dist / speed) * 1000));
          const id = toastId.value;
          translateX.value = withTiming(target, {
            duration,
            easing: Easing.out(Easing.cubic),
          });
          swipeOpacity.value = withTiming(0, { duration: Math.min(duration, 200) }, (finished) => {
            if (finished) runOnJS(finishSwipeHideJs)(id);
          });
          runOnJS(markSwipeDismissJs)(id);
        })
        .onFinalize((_event, success) => {
          if (success || swipeSettled.value === 1) return;
          if (dragged.value === 0 && Math.abs(translateX.value) < 1) return;
          swipeSettled.value = 1;
          translateX.value = withSpring(0, SWIPE_BACK);
          swipeOpacity.value = withTiming(1, { duration: 140 });
          runOnJS(resumeHideJs)();
        }),
    [
      dragged,
      finishSwipeHideJs,
      markDraggedJs,
      markSwipeDismissJs,
      actionTap,
      onSwipeStartJs,
      progress,
      resumeHideJs,
      screenWidth,
      swipeOpacity,
      swipeSettled,
      tap,
      toastId,
      translateX,
    ]
  );

  useEffect(() => {
    return subscribe((payload) => {
      clearHideTimer();
      if (!payload) {
        if (swipeDismissing.current) return;
        progress.value = withTiming(0, { duration: 200 }, (done) => {
          if (done) runOnJS(finishHide)();
        });
        return;
      }
      cancelAnimation(translateX);
      cancelAnimation(swipeOpacity);
      cancelAnimation(progress);
      swipeDismissing.current = false;
      draggedRef.current = false;
      visibleId.current = payload.id;
      durationRef.current = payload.durationMs;
      toastId.value = payload.id;
      translateX.value = 0;
      swipeOpacity.value = 1;
      dragged.value = 0;
      setToast(payload);
      setMounted(true);
      progress.value = 0;
      progress.value = withSpring(1, SPRING);
      armHide(payload.durationMs);
    });
  }, [armHide, clearHideTimer, dragged, finishHide, progress, swipeOpacity, toastId, translateX]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value * swipeOpacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: (1 - progress.value) * -36 },
      {
        rotate: `${interpolate(
          translateX.value,
          [-180, 0, 180],
          [-7, 0, 7],
          Extrapolation.CLAMP
        )}deg`,
      },
      { scaleX: 0.55 + progress.value * 0.45 },
      { scaleY: 0.72 + progress.value * 0.28 },
    ],
  }));

  const chrome = useMemo(() => {
    const kind = toast?.kind ?? "success";
    if (kind === "error") {
      return { icon: "alert-circle" as const, iconColor: "#FF8A80" };
    }
    if (kind === "warning") {
      return { icon: "warning" as const, iconColor: "#FFD54F" };
    }
    if (kind === "info") {
      return { icon: "information-circle" as const, iconColor: "#FFFFFF" };
    }
    return { icon: "cloud-upload-outline" as const, iconColor: "#FFFFFF" };
  }, [toast?.kind]);

  if (!mounted || !toast) return null;

  const a11y = toast.hideTitle || !toast.title
    ? toast.message || toast.title
    : toast.message
      ? `${toast.title}. ${toast.message}`
      : toast.title;
  const topInset = toastTopInset(insets.top);
  const showTitle = !toast.hideTitle && !!toast.title;
  const ellipsisAction = !!(toast.action && toast.actionAsEllipsis);
  const chipAction = !!(toast.action && !toast.actionAsEllipsis);

  const pill = (
    <View pointerEvents="box-none" style={[styles.host, { paddingTop: topInset }]}>
      <GestureDetector gesture={pan}>
        <Animated.View collapsable={false} style={[styles.pillWrap, animStyle]}>
          <View style={styles.pill}>
            <GestureDetector gesture={tap}>
              <View
                collapsable={false}
                style={styles.pillMain}
                accessibilityRole="button"
                accessibilityLabel={a11y}
              >
                {toast.hideIcon ? null : (
                  <View style={styles.iconDisk}>
                    <Ionicons name={chrome.icon} size={18} color={chrome.iconColor} />
                  </View>
                )}
                {toast.hideMark ? null : (
                  <View style={styles.mark}>
                    <Text style={styles.markText}>M</Text>
                  </View>
                )}
                <View style={styles.textCol}>
                  {showTitle ? (
                    <Text style={styles.title} numberOfLines={1}>
                      {toast.title}
                    </Text>
                  ) : null}
                  {toast.message ? (
                    <Text
                      style={[styles.message, !showTitle && styles.messageSolo]}
                      numberOfLines={toast.kind === "error" || toast.kind === "warning" ? 3 : 2}
                    >
                      {toast.message}
                    </Text>
                  ) : null}
                </View>
                {!toast.action ? (
                  <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.85)" />
                ) : null}
              </View>
            </GestureDetector>
            {ellipsisAction ? (
              <GestureDetector gesture={actionTap}>
                <View
                  collapsable={false}
                  style={styles.ellipsisHit}
                  accessibilityRole="button"
                  accessibilityLabel={toast.action?.label}
                >
                  <Ionicons name="ellipsis-horizontal" size={18} color="rgba(255,255,255,0.85)" />
                </View>
              </GestureDetector>
            ) : null}
            {chipAction ? (
              <GestureDetector gesture={actionTap}>
                <View
                  collapsable={false}
                  style={styles.actionChip}
                  accessibilityRole="button"
                  accessibilityLabel={toast.action?.label}
                >
                  <Text style={styles.actionText} numberOfLines={1}>
                    {toast.action?.label}
                  </Text>
                </View>
              </GestureDetector>
            ) : null}
          </View>
        </Animated.View>
      </GestureDetector>
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
  messageSolo: {
    marginTop: 0,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  ellipsisHit: {
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
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
