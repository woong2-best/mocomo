import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useI18n } from "@/i18n/I18nProvider";

const COLORS = ["#FF6B4A", "#FFD166", "#06D6A0", "#4CC9F0", "#F72585", "#FFE66D", "#FFFFFF"];

type Particle = {
  id: number;
  x: number;
  color: string;
  delay: number;
  drift: number;
  size: number;
};

function FireworkParticle({
  p,
  height,
}: {
  p: Particle;
  height: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      p.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [p.delay, progress]);

  const style = useAnimatedStyle(() => {
    const y = -progress.value * height * 0.72;
    const x = p.x + p.drift * progress.value;
    const opacity = progress.value < 0.15 ? progress.value / 0.15 : 1 - (progress.value - 0.15) / 0.85;
    const scale = 0.4 + progress.value * 1.2;
    return {
      opacity: Math.max(0, opacity),
      transform: [{ translateX: x }, { translateY: y }, { scale }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
          backgroundColor: p.color,
          bottom: height * 0.22,
          left: "50%",
          marginLeft: -p.size / 2,
        },
        style,
      ]}
    />
  );
}

type Props = {
  visible: boolean;
  onDone: () => void;
};

/** Full-screen signup-complete celebration plus birthday fireworks. */
export function SignupCompleteCelebration({ visible, onDone }: Props) {
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [ready, setReady] = useState(false);

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 42 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * width * 0.85,
        color: COLORS[i % COLORS.length]!,
        delay: Math.floor(Math.random() * 900),
        drift: (Math.random() - 0.5) * width * 0.55,
        size: 6 + Math.random() * 8,
      })),
    [width]
  );

  useEffect(() => {
    if (!visible) {
      setReady(false);
      return;
    }
    setReady(true);
    const t = setTimeout(() => onDone(), 3200);
    return () => clearTimeout(t);
  }, [onDone, visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.root}>
        <View style={[styles.stage, { width, height }]} pointerEvents="none">
          {ready
            ? particles.map((p) => <FireworkParticle key={p.id} p={p} height={height} />)
            : null}
        </View>
        <Text style={styles.title}>{t("m.auth.sign_up_complete")}</Text>
        <Text style={styles.sub}>{t("m.auth.welcome_to_mocomo")}</Text>
        <Pressable style={styles.btn} onPress={onDone}>
          <Text style={styles.btnText}>{t("m.auth.get_started")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function SignupBusyOverlay({ label }: { label: string }) {
  return (
    <View style={styles.busy}>
      <ActivityIndicator color="#fff" size="large" />
      <Text style={styles.busyText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(8,10,16,0.92)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stage: {
    ...StyleSheet.absoluteFill,
    overflow: "hidden",
  },
  particle: {
    position: "absolute",
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 10,
    color: "rgba(255,255,255,0.7)",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  btn: {
    marginTop: 28,
    backgroundColor: "#CF6640",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
  },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  busy: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    zIndex: 20,
  },
  busyText: { color: "#fff", fontWeight: "700" },
});
