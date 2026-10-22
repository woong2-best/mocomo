import { memo, useEffect, useRef, useState, type RefObject } from "react";
import { AccessibilityInfo, StyleSheet, Text, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";
import { useI18n } from "@/i18n/I18nProvider";
import {
  createAiMotion,
  setLook,
  stepAiMotion,
  type AiMotionState,
  type AiPose,
} from "@/features/live/ai/ai-motion";

type Props = {
  motionRef: RefObject<AiMotionState | null>;
  width: number;
};

const IDLE: AiPose = {
  breath: 0,
  head: 0,
  blink: 0,
  lookX: 0,
  lookY: 0,
  mouth: 0,
  angry: 0,
};

function AiLiveStageInner({ motionRef, width }: Props) {
  const { t } = useI18n();
  const height = Math.round(width * (9 / 16));
  const [pose, setPose] = useState<AiPose>(IDLE);
  const reducedRef = useRef(false);

  useEffect(() => {
    if (!motionRef.current) motionRef.current = createAiMotion(Date.now());
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) reducedRef.current = on;
    });
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const motion = motionRef.current;
      if (motion && now - last > 32) {
        last = now;
        setPose(stepAiMotion(motion, now, reducedRef.current));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, [motionRef]);

  const eye = Math.max(0.08, 1 - pose.blink * 0.92);
  const mouthRy = 1.15 + pose.mouth * 6.4;

  return (
    <View
      accessibilityLabel={t("m.live.ai_official_badge")}
      style={{ width, height, backgroundColor: "#07060a" }}
      onTouchStart={(e) => {
        const motion = motionRef.current;
        if (!motion) return;
        setLook(
          motion,
          (e.nativeEvent.locationX / width - 0.5) * 2,
          (e.nativeEvent.locationY / height - 0.42) * 2
        );
      }}
      onTouchMove={(e) => {
        const motion = motionRef.current;
        if (!motion) return;
        setLook(
          motion,
          (e.nativeEvent.locationX / width - 0.5) * 2,
          (e.nativeEvent.locationY / height - 0.42) * 2
        );
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 240 135">
        <Defs>
          <RadialGradient id="aiSpot" cx="50%" cy="42%" r="70%">
            <Stop offset="0" stopColor="#3a2418" />
            <Stop offset="1" stopColor="#07060a" />
          </RadialGradient>
        </Defs>
        <Rect width="240" height="135" fill="url(#aiSpot)" />
        <G transform={`translate(0 ${pose.breath})`}>
          <Path d="M62 118 Q120 96 178 118 L196 140 L44 140 Z" fill="#c45c3e" />
          <Path d="M108 108 Q120 118 132 108 L128 120 Q120 124 112 120 Z" fill="#f6e7d4" />
        </G>
        <G transform={`rotate(${pose.head} 120 96)`}>
          <Path
            d="M86 58 C74 18 120 6 162 28 C188 48 186 92 174 120 Q140 100 120 98 Q96 102 66 122 C58 90 64 70 86 58 Z"
            fill="#2c1a24"
          />
          <Rect x="108" y="86" width="24" height="18" rx="6" fill="#f2c7b0" />
          <Ellipse cx="120" cy="62" rx="30" ry="34" fill="#f2c7b0" />
          <Ellipse cx="100" cy="72" rx="7" ry="4" fill="rgba(244,114,182,0.38)" />
          <Ellipse cx="140" cy="72" rx="7" ry="4" fill="rgba(244,114,182,0.38)" />
          <Path
            d={pose.angry > 0.5 ? "M96 48 L112 53 M144 48 L128 53" : "M96 51 L112 48 M144 51 L128 48"}
            stroke="#3a2418"
            strokeWidth={1.7}
            strokeLinecap="round"
          />
          <G transform={`translate(106 60) scale(1 ${eye})`}>
            <Ellipse cx="0" cy="0" rx="8" ry="6.2" fill="#fff" />
            <Circle cx={pose.lookX * 2.2} cy={pose.lookY * 1.5} r="3.1" fill="#4a6741" />
            <Circle cx={pose.lookX * 2.2} cy={pose.lookY * 1.5} r="1.5" fill="#1c140c" />
            <Circle cx={pose.lookX * 2.2 + 1.1} cy={pose.lookY * 1.5 - 1.2} r="0.9" fill="#fff" />
          </G>
          <G transform={`translate(134 60) scale(1 ${eye})`}>
            <Ellipse cx="0" cy="0" rx="8" ry="6.2" fill="#fff" />
            <Circle cx={pose.lookX * 2.2} cy={pose.lookY * 1.5} r="3.1" fill="#4a6741" />
            <Circle cx={pose.lookX * 2.2} cy={pose.lookY * 1.5} r="1.5" fill="#1c140c" />
            <Circle cx={pose.lookX * 2.2 + 1.1} cy={pose.lookY * 1.5 - 1.2} r="0.9" fill="#fff" />
          </G>
          <Ellipse
            cx="120"
            cy="78"
            rx={7 + pose.mouth * 2}
            ry={mouthRy}
            fill={pose.mouth > 0.18 ? "#7a3040" : "#e48aaa"}
            stroke="#c45c78"
            strokeWidth={1.3}
          />
          <Path d="M92 38 Q120 24 150 38 Q138 52 120 46 Q102 52 92 38 Z" fill="#3a2430" />
        </G>
      </Svg>
      <View style={styles.badge} pointerEvents="none">
        <Text style={styles.badgeText}>{t("m.live.ai_official_badge")}</Text>
      </View>
    </View>
  );
}

export const AiLiveStage = memo(AiLiveStageInner);

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    left: 12,
    bottom: 10,
    backgroundColor: "#1a4fa0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
});
