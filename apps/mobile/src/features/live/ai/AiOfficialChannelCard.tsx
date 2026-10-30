import { memo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import type { AiStageFiles } from "@/features/live/ai/ai-speak";
import { useVrmStill } from "@/features/live/ai/vrm-still-cache";
import { liveCategoryEnglish } from "@/features/live/live-categories";
import { API_BASE_URL } from "@/config/env";
import { IMAGE_CACHE_POLICY, liveStillDecodeSize } from "@/perf/image";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { FolkAvatar } from "@/ui/FolkAvatar";

type Props = {
  onPress: () => void;
  onPressHost?: () => void;
  title?: string;
  host?: string;
  hostUsername?: string;
  hostImage?: string | null;
  sub?: string;
  accent?: string;
  stage: AiStageFiles;
  fallbackPoster?: number;
};

function absUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
}

function AiOfficialChannelCardInner({
  onPress,
  onPressHost,
  title,
  host,
  hostUsername,
  hostImage,
  sub,
  accent,
  stage,
  fallbackPoster,
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const thumbW = Math.round(Math.min(width * 0.42, 188));
  const thumbH = Math.round(thumbW * (9 / 16));
  const decode = liveStillDecodeSize(thumbW, thumbH);
  const displayName = host ?? t("m.live.ai_host_name");
  const still = useVrmStill(stage.characterId);
  const backdrop = absUrl(stage.backdropUrl);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={[styles.thumb, { width: thumbW, height: thumbH, backgroundColor: accent ?? "#241c33" }]}
      >
        {still ? (
          <Image
            source={{ uri: still, width: decode.width, height: decode.height }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={still}
            allowDownscaling={false}
            transition={0}
          />
        ) : backdrop ? (
          <Image
            source={{ uri: backdrop, width: decode.width, height: decode.height }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={backdrop}
            allowDownscaling={false}
            transition={0}
          />
        ) : fallbackPoster != null ? (
          <Image
            source={fallbackPoster}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            allowDownscaling={false}
            transition={0}
          />
        ) : null}
        <View style={styles.badge} pointerEvents="none">
          <Text style={styles.badgeText}>{t(accent ? "m.live.idol_badge" : "m.live.ai_official_badge")}</Text>
        </View>
      </Pressable>
      <View style={styles.meta}>
        <Text style={styles.cat} numberOfLines={1}>
          {liveCategoryEnglish("JUST_CHATTING")}
        </Text>
        <Pressable onPress={onPress} accessibilityRole="button">
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {title ?? t("m.live.ai_card_title")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onPressHost ?? onPress}
          style={styles.hostRow}
          accessibilityRole="button"
          accessibilityLabel={hostUsername ? `@${hostUsername}` : displayName}
        >
          <FolkAvatar uri={hostImage} name={displayName} size={28} framed={false} />
          <View style={styles.hostText}>
            <Text style={[styles.host, { color: colors.textSecondary }]} numberOfLines={1}>
              {displayName}
            </Text>
            {hostUsername ? (
              <Text style={[styles.handle, { color: colors.textMuted }]} numberOfLines={1}>
                @{hostUsername}
              </Text>
            ) : null}
          </View>
        </Pressable>
        <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
          {sub ?? t("m.live.ai_card_sub")}
        </Text>
      </View>
    </View>
  );
}

export const AiOfficialChannelCard = memo(AiOfficialChannelCardInner);

/** Featured room on the hub. Still or backdrop only — a live WebView overflows Android lists. */
export function AiStageHero({
  onPress,
  onPressHost,
  stage,
  host,
  hostUsername,
  hostImage,
  fallbackPoster,
}: {
  onPress: () => void;
  onPressHost?: () => void;
  stage: AiStageFiles;
  host?: string;
  hostUsername?: string;
  hostImage?: string | null;
  fallbackPoster?: number;
}) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));
  const decode = liveStillDecodeSize(width, height);
  const still = useVrmStill(stage.characterId);
  const backdrop = absUrl(stage.backdropUrl);
  return (
    <View style={{ width, backgroundColor: "#000" }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={{ width, height, backgroundColor: "#000", overflow: "hidden" }}
      >
        {still ? (
          <Image
            source={{ uri: still, width: decode.width, height: decode.height }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={still}
            allowDownscaling={false}
            priority="high"
            transition={0}
          />
        ) : backdrop ? (
          <Image
            source={{ uri: backdrop, width: decode.width, height: decode.height }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={backdrop}
            allowDownscaling={false}
            priority="high"
            transition={0}
          />
        ) : fallbackPoster != null ? (
          <Image
            source={fallbackPoster}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            allowDownscaling={false}
            priority="high"
            transition={0}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "#241c33" }]} />
        )}
      </Pressable>
      {host || hostUsername ? (
        <Pressable
          onPress={onPressHost ?? onPress}
          style={styles.heroHost}
          accessibilityRole="button"
          accessibilityLabel={hostUsername ? `@${hostUsername}` : host}
        >
          <FolkAvatar uri={hostImage} name={host ?? hostUsername ?? "?"} size={32} framed={false} />
          <View style={styles.hostText}>
            {host ? <Text style={styles.heroHostName}>{host}</Text> : null}
            {hostUsername ? <Text style={styles.heroHandle}>@{hostUsername}</Text> : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

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
    backgroundColor: "#241c33",
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
  cat: { color: "#4da3ff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontWeight: "800", fontSize: 15 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  hostText: { flex: 1, minWidth: 0 },
  host: { fontWeight: "700", fontSize: 13 },
  handle: { fontWeight: "600", fontSize: 11 },
  sub: { fontWeight: "600", fontSize: 12 },
  heroHost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#000",
  },
  heroHostName: { color: "#fff", fontWeight: "800", fontSize: 13 },
  heroHandle: { color: "rgba(255,255,255,0.78)", fontWeight: "600", fontSize: 11 },
});
