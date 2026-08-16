import { useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
} from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/ThemeContext";
import { type ThemeColors } from "@/theme/tokens";

const BAR_COUNT = 28;

function formatVoiceTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Instagram-style voice bubble — matches web ChatVoiceMessage */
export function ChatVoiceMessage({ url, mine }: { url: string; mine: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors, mine), [colors, mine]);
  const player = useAudioPlayer(url, { updateInterval: 80 });
  const status = useAudioPlayerStatus(player);
  const barHeights = useMemo(
    () => Array.from({ length: BAR_COUNT }, (_, i) => 30 + ((i * 17) % 55)),
    []
  );

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (status.didJustFinish) {
      void player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const toggle = useCallback(() => {
    if (!status.isLoaded) return;
    if (status.playing) {
      player.pause();
      return;
    }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.05) {
      void player.seekTo(0);
    }
    player.play();
  }, [player, status.isLoaded, status.playing, status.currentTime, status.duration]);

  const duration = status.duration > 0 ? status.duration : 0;
  const progress = duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const displaySec = status.playing ? status.currentTime : duration;

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.playBtn} onPress={toggle} accessibilityLabel={status.playing ? "일시정지" : "재생"}>
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={18}
          color={mine ? "#fff" : colors.cobalt}
          style={!status.playing ? { marginLeft: 2 } : undefined}
        />
      </Pressable>
      <View style={styles.bars}>
        {barHeights.map((h, i) => {
          const filled = i / BAR_COUNT <= progress;
          return (
            <View
              key={i}
              style={[
                styles.bar,
                { height: `${h}%` },
                filled ? styles.barFilled : styles.barEmpty,
              ]}
            />
          );
        })}
      </View>
      <Text style={styles.time}>{formatVoiceTime(displaySec)}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors, mine: boolean) {
  return StyleSheet.create({
    wrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 220,
      maxWidth: 280,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: mine ? colors.terracotta : colors.surfaceRaised,
      borderWidth: mine ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    playBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: mine ? "rgba(255,255,255,0.22)" : colors.surface,
    },
    bars: {
      flex: 1,
      height: 32,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 2,
    },
    bar: { width: 3, borderRadius: 2 },
    barFilled: { backgroundColor: mine ? "#fff" : colors.cobalt },
    barEmpty: {
      backgroundColor: mine ? "rgba(255,255,255,0.35)" : "rgba(27,74,140,0.25)",
    },
    time: {
      fontSize: 11,
      fontVariant: ["tabular-nums"],
      color: mine ? "rgba(255,255,255,0.85)" : colors.textMuted,
      fontWeight: "600",
    },
  });
}
