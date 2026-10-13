import { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import Svg, {
  ClipPath,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import * as Haptics from "expo-haptics";

type Props = {
  nickname: string;
  serial: string;
  fortuneText: string;
  mode: "closed" | "auto-open" | "opened";
  size?: number;
};

const BODY =
  "M82 60C55 85 40 125 44 160C50 215 95 256 150 258C205 260 252 215 258 160C261 125 250 95 234 75C224 70 215 74 205 90C190 115 165 160 154 203C140 160 115 105 98 72C92 62 88 58 82 60Z";

function CookieArt({ clip }: { clip: string }) {
  return (
    <G clipPath={clip}>
      <Path d={BODY} fill="url(#fcg)" />
      <Rect width="300" height="300" fill="url(#fcvs)" />
      <Path
        d="M154 203C165 160 190 115 205 90C214 76 224 70 234 75C222 82 210 98 198 120C182 150 166 180 154 203Z"
        fill="#b87a2c"
        opacity={0.45}
      />
      <Path
        d="M154 203C165 160 190 115 205 90C214 76 224 70 234 75"
        fill="none"
        stroke="#fbe7b4"
        strokeOpacity={0.7}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      <Path
        d="M98 72C115 105 140 160 154 203"
        fill="none"
        stroke="#a8691f"
        strokeOpacity={0.5}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </G>
  );
}

export function FortuneCookieVisual({
  nickname,
  serial,
  fortuneText,
  mode,
  size = 280,
}: Props) {
  const left = useMemo(() => new Animated.Value(mode === "opened" ? 1 : 0), [mode]);
  const paper = useMemo(() => new Animated.Value(mode === "opened" ? 1 : 0), [mode]);
  const shake = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (mode === "opened") {
      left.setValue(1);
      paper.setValue(1);
      return;
    }
    if (mode !== "auto-open") return;

    const start = setTimeout(() => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.sequence([
        Animated.timing(shake, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -1, duration: 90, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0.6, duration: 80, useNativeDriver: true }),
        Animated.timing(shake, { toValue: 0, duration: 80, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(left, {
            toValue: 1,
            duration: 750,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(paper, {
            toValue: 1,
            duration: 800,
            delay: 280,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 1000);

    return () => clearTimeout(start);
  }, [left, mode, paper, shake]);

  const rotateL = left.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-8deg"] });
  const rotateR = left.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "8deg"] });
  const shakeDeg = shake.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Animated.View style={{ transform: [{ rotate: shakeDeg }] }}>
        <View style={{ width: size, height: size }}>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotateL }] }]}>
            <Svg viewBox="0 0 300 300" width={size} height={size}>
              <Defs>
                <RadialGradient id="fcg" cx="35%" cy="38%" r="80%">
                  <Stop offset="0" stopColor="#f6d896" />
                  <Stop offset="0.5" stopColor="#e9bb70" />
                  <Stop offset="0.9" stopColor="#d09646" />
                  <Stop offset="1" stopColor="#bd8038" />
                </RadialGradient>
                <LinearGradient id="fcvs" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.55" stopColor="#7a4a14" stopOpacity="0" />
                  <Stop offset="1" stopColor="#7a4a14" stopOpacity="0.3" />
                </LinearGradient>
                <ClipPath id="body">
                  <Path d={BODY} />
                </ClipPath>
                <ClipPath id="cl">
                  <Polygon points="0,0 154,0 154,195 148,213 159,226 148,241 155,257 150,300 0,300" />
                </ClipPath>
              </Defs>
              <Ellipse cx="150" cy="258" rx="105" ry="12" fill="#3a2a18" opacity={0.18} />
              <G clipPath="url(#body)">
                <CookieArt clip="url(#cl)" />
              </G>
            </Svg>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: rotateR }] }]}>
            <Svg viewBox="0 0 300 300" width={size} height={size}>
              <Defs>
                <RadialGradient id="fcg2" cx="35%" cy="38%" r="80%">
                  <Stop offset="0" stopColor="#f6d896" />
                  <Stop offset="0.5" stopColor="#e9bb70" />
                  <Stop offset="0.9" stopColor="#d09646" />
                  <Stop offset="1" stopColor="#bd8038" />
                </RadialGradient>
                <LinearGradient id="fcvs2" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0.55" stopColor="#7a4a14" stopOpacity="0" />
                  <Stop offset="1" stopColor="#7a4a14" stopOpacity="0.3" />
                </LinearGradient>
                <ClipPath id="body2">
                  <Path d={BODY} />
                </ClipPath>
                <ClipPath id="cr">
                  <Polygon points="300,0 154,0 154,195 148,213 159,226 148,241 155,257 150,300 300,300" />
                </ClipPath>
              </Defs>
              <G clipPath="url(#body2)">
                <G clipPath="url(#cr)">
                  <Path d={BODY} fill="url(#fcg2)" />
                  <Rect width="300" height="300" fill="url(#fcvs2)" />
                  <Path
                    d="M154 203C165 160 190 115 205 90C214 76 224 70 234 75C222 82 210 98 198 120C182 150 166 180 154 203Z"
                    fill="#b87a2c"
                    opacity={0.45}
                  />
                </G>
              </G>
            </Svg>
          </Animated.View>
        </View>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.paper,
          {
            opacity: paper,
            transform: [
              {
                scaleX: paper.interpolate({ inputRange: [0, 1], outputRange: [0.08, 1] }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.nickname}>{nickname}</Text>
        <Text style={styles.serial}>{serial}</Text>
        <Text style={styles.fortune}>{fortuneText}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  paper: {
    position: "absolute",
    top: "52%",
    width: "86%",
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff8ea",
    borderWidth: 1,
    borderColor: "#ead9b4",
    borderRadius: 2,
    alignItems: "center",
    gap: 4,
  },
  nickname: {
    fontSize: 12,
    fontWeight: "700",
    color: "#3a2a18",
    textAlign: "center",
  },
  serial: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8a5516",
    letterSpacing: 0.4,
  },
  fortune: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3a2a18",
    textAlign: "center",
    lineHeight: 18,
  },
});
