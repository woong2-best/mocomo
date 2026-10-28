import { memo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { AiVrmStage } from "@/features/live/ai/AiVrmStage";
import type { AiStageFiles } from "@/features/live/ai/ai-speak";
import { liveCategoryEnglish } from "@/features/live/live-categories";
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

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={[styles.thumb, { width: thumbW, height: thumbH, backgroundColor: accent ?? "#241c33" }]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AiVrmStage
            vrmUrl={stage.vrmUrl}
            backdropUrl={stage.backdropUrl}
            characterId={stage.characterId}
            framing="bust"
            maxPixelRatio={1}
          />
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
  stage,
}: {
  onPress: () => void;
  stage: AiStageFiles;
}) {
  const { width } = useWindowDimensions();
  const height = Math.round(width * (9 / 16));
  return (
    <View style={{ width, height, backgroundColor: "#000", overflow: "hidden" }}>
      <Pressable onPress={onPress} accessibilityRole="button" style={StyleSheet.absoluteFill}>
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AiVrmStage
            vrmUrl={stage.vrmUrl}
            backdropUrl={stage.backdropUrl}
            characterId={stage.characterId}
            framing="bust"
            maxPixelRatio={1.25}
          />
        </View>
      </Pressable>
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
  meta: { flex: 1, justifyContent: "center", gap: 3 },
  cat: { color: "#4da3ff", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { fontWeight: "800", fontSize: 15 },
  hostRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 },
  hostText: { flex: 1, minWidth: 0 },
  host: { fontWeight: "700", fontSize: 13 },
  handle: { fontWeight: "600", fontSize: 11 },
  sub: { fontWeight: "600", fontSize: 12 },
});
