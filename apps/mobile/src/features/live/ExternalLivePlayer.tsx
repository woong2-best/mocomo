import { useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import type { LiveExternalInfo } from "@/api/live";
import { providerLabel } from "@/features/live/live-categories";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

type Props = {
  external: LiveExternalInfo;
  title: string;
};

/**
 * External platform player only — no chat/donation overlays on the video.
 * Mirrors web ExternalLivePlayer (iframe sibling panel pattern).
 */
export function ExternalLivePlayer({ external, title }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [failed, setFailed] = useState(false);
  const showEmbed = external.embedSupported && !!external.embedUrl && !failed;

  return (
    <View style={styles.wrap}>
      <View style={styles.player}>
        {showEmbed ? (
          <WebView
            source={{ uri: external.embedUrl! }}
            style={styles.webview}
            allowsFullscreenVideo
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
            setSupportMultipleWindows={false}
            onHttpError={() => setFailed(true)}
            onError={() => setFailed(true)}
            userAgent="Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackText}>
              {external.provider.toUpperCase() === "CHZZK"
                ? "치지직 임베드가 이 환경에서 지원되지 않습니다."
                : "원본 페이지에서 시청해 주세요."}
            </Text>
            <Pressable
              style={styles.openBtn}
              onPress={() => void Linking.openURL(external.watchUrl).catch(() => undefined)}
            >
              <Ionicons name="open-outline" size={16} color="#111" />
              <Text style={styles.openBtnText}>새 창에서 시청하기</Text>
            </Pressable>
          </View>
        )}
      </View>
      {showEmbed ? (
        <View style={styles.bar}>
          <Text style={styles.barText} numberOfLines={1}>
            {providerLabel(external.provider)} · {title}
          </Text>
          <Pressable
            onPress={() => void Linking.openURL(external.watchUrl).catch(() => undefined)}
            hitSlop={8}
            style={styles.barLink}
          >
            <Text style={styles.barLinkText}>원본</Text>
            <Ionicons name="open-outline" size={12} color="rgba(255,255,255,0.75)" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      borderRadius: 12,
      overflow: "hidden",
      backgroundColor: "#000",
    },
    player: {
      width: "100%",
      aspectRatio: 16 / 9,
      minHeight: 200,
      backgroundColor: "#000",
    },
    webview: { flex: 1, backgroundColor: "#000" },
    fallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.lg,
      gap: 14,
    },
    fallbackText: {
      color: "rgba(255,255,255,0.8)",
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 20,
    },
    openBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#fff",
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    openBtnText: { color: "#111", fontWeight: "800", fontSize: 13 },
    bar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: "rgba(255,255,255,0.12)",
      backgroundColor: "#0a0a0a",
    },
    barText: { flex: 1, color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: "600" },
    barLink: { flexDirection: "row", alignItems: "center", gap: 3 },
    barLinkText: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700" },
  });
}
