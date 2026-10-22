import { memo, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import {
  createAiMotion,
  stepAiMotion,
  type AiMotionState,
  type AiPose,
} from "@/features/live/ai/ai-motion";

const REST: AiPose = {
  breath: 0,
  head: 0,
  blink: 0,
  lookX: 0,
  lookY: 0,
  mouth: 0,
  angry: 0,
};

function AiOfficialChannelCardInner() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const thumbW = Math.round(Math.min(width * 0.42, 188));
  const thumbH = Math.round(thumbW * (9 / 16));
  const motionRef = useRef<AiMotionState | null>(null);
  const [pose, setPose] = useState<AiPose>(REST);

  useEffect(() => {
    motionRef.current = createAiMotion(Date.now());
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const motion = motionRef.current;
      if (motion && now - last > 40) {
        last = now;
        setPose(stepAiMotion(motion, now, false));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const eye = Math.max(0.14, 1 - pose.blink * 0.9);

  return (
    <View style={styles.row} accessibilityLabel={t("m.live.ai_official_badge")}>
      <View style={[styles.thumb, { width: thumbW, height: thumbH }]}>
        <Svg width={thumbW} height={thumbH} viewBox="0 0 160 90">
          <Rect width="160" height="90" fill="#f6d5c4" />
          <G transform={`translate(0 ${pose.breath * 0.45})`}>
            <Path d="M16 72 Q80 56 144 72 L156 90 L4 90 Z" fill="#c45c3e" />
            <Path d="M66 70 Q80 78 94 70 L90 82 Q80 86 70 82 Z" fill="#f6e7d4" />
          </G>
          <G transform={`rotate(${pose.head} 80 52)`}>
            <Path
              d="M42 50 C36 22 72 12 84 16 C108 8 124 28 120 52 C116 74 98 84 80 80 C60 84 44 70 42 50 Z"
              fill="#3a2430"
            />
            <Ellipse cx="80" cy="50" rx="28" ry="30" fill="#f3c7b4" />
            <Ellipse cx="66" cy="56" rx="6" ry="3.2" fill="rgba(232,120,150,0.5)" />
            <Ellipse cx="94" cy="56" rx="6" ry="3.2" fill="rgba(232,120,150,0.5)" />
            <Path d="M56 36 Q80 26 104 36 Q92 44 80 40 Q68 44 56 36 Z" fill="#3a2430" />
            <G transform={`translate(68 46) scale(1 ${eye})`}>
              <Ellipse cx="0" cy="0" rx="6.2" ry="5" fill="#fff" />
              <Circle cx="0" cy="0" r="2.6" fill="#4a6741" />
              <Circle cx="0" cy="0" r="1.3" fill="#1a120c" />
              <Circle cx="1" cy="-1" r="0.7" fill="#fff" />
            </G>
            <G transform={`translate(92 46) scale(1 ${eye})`}>
              <Ellipse cx="0" cy="0" rx="6.2" ry="5" fill="#fff" />
              <Circle cx="0" cy="0" r="2.6" fill="#4a6741" />
              <Circle cx="0" cy="0" r="1.3" fill="#1a120c" />
              <Circle cx="1" cy="-1" r="0.7" fill="#fff" />
            </G>
            <Path d="M70 64 Q80 68 90 64" stroke="#c45c78" strokeWidth={1.8} fill="none" strokeLinecap="round" />
          </G>
        </Svg>
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{t("m.live.ai_official_badge")}</Text>
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {t("m.live.ai_card_title")}
        </Text>
        <Text style={[styles.host, { color: colors.textSecondary }]} numberOfLines={1}>
          {t("m.live.ai_host_name")}
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
          {t("m.live.ai_card_sub")}
        </Text>
      </View>
    </View>
  );
}

export const AiOfficialChannelCard = memo(AiOfficialChannelCardInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  thumb: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f6d5c4",
  },
  badge: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#1a4fa0",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: "#fff", fontSize: 8, fontWeight: "900" },
  meta: { flex: 1, justifyContent: "center", gap: 3 },
  title: { fontWeight: "800", fontSize: 15 },
  host: { fontWeight: "700", fontSize: 13 },
  sub: { fontWeight: "600", fontSize: 12 },
});
