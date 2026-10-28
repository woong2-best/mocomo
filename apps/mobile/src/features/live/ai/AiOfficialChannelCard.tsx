import { memo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { AiVrmStage } from "@/features/live/ai/AiVrmStage";
import type { AiStageFiles } from "@/features/live/ai/ai-speak";
import { useVrmStill } from "@/features/live/ai/vrm-still-cache";
import { liveCategoryEnglish } from "@/features/live/live-categories";
import { API_BASE_URL } from "@/config/env";
import { IMAGE_CACHE_POLICY } from "@/perf/image";
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
}: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const thumbW = Math.round(Math.min(width * 0.42, 188));
  const thumbH = Math.round(thumbW * (9 / 16));
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
            source={{ uri: still }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={still}
            transition={0}
          />
        ) : backdrop ? (
          <Image
            source={{ uri: backdrop }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy={IMAGE_CACHE_POLICY}
            recyclingKey={backdrop}
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

/** Featured stage on the hub. Same model and room as the website tile. */
export function AiStageHero({
  onPress,
  onPressHost,
  hint,
  stage,
  host,
  hostUsername,
  hostImage,
}: {
  onPress: () => void;
  onPressHost?: () => void;
  hint: string;
  stage: AiStageFiles;
  host?: string;
  hostUsername?: string;
  hostImage?: string | null;
}) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));
  const still = useVrmStill(stage.characterId);
  return (
    <View style={{ width, height, backgroundColor: "#000", overflow: "hidden" }} collapsable={false}>
      <Pressable onPress={onPress} accessibilityRole="button" style={StyleSheet.absoluteFill}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {still ? (
            <Image
              source={{ uri: still }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy={IMAGE_CACHE_POLICY}
              recyclingKey={still}
              transition={0}
            />
          ) : (
            <AiVrmStage
              vrmUrl={stage.vrmUrl}
              backdropUrl={stage.backdropUrl}
              characterId={stage.characterId}
              framing="bust"
              maxPixelRatio={1}
              inList
            />
          )}
        </View>
        <Text style={styles.heroHint}>{hint}</Text>
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
  heroHint: {
    position: "absolute",
    right: 16,
    top: "38%",
    width: "42%",
    color: "rgba(255,255,255,0.82)",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    textAlign: "left",
  },
  heroHost: {
    position: "absolute",
    left: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "55%",
    paddingRight: 10,
    paddingVertical: 4,
    paddingLeft: 4,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  heroHostName: { color: "#fff", fontWeight: "800", fontSize: 13 },
  heroHandle: { color: "rgba(255,255,255,0.78)", fontWeight: "600", fontSize: 11 },
});
