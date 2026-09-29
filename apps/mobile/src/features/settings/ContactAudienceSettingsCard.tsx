import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  fetchContactSettings,
  updateContactSettings,
  type ContactSettings,
} from "@/api/contact-settings";
import { FolkCard } from "@/ui/FolkCard";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const DEFAULTS: ContactSettings = {
  messageRequestAudience: "EVERYONE",
  callRequestAudience: "EVERYONE",
};

export function ContactAudienceSettingsCard() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<ContactSettings>(DEFAULTS);

  useEffect(() => {
    void fetchContactSettings()
      .then(setSettings)
      .catch(() => showIslandError("오류", "설정을 불러오지 못했습니다."))
      .finally(() => setLoading(false));
  }, []);

  async function save(patch: Partial<ContactSettings>) {
    if (busy) return;
    const previous = settings;
    const next = { ...settings, ...patch };
    setSettings(next);
    setBusy(true);
    try {
      const saved = await updateContactSettings(patch);
      setSettings(saved);
    } catch (e) {
      setSettings(previous);
      showIslandError("오류", e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <FolkCard>
      <Text style={styles.title}>메시지 요청 허용 범위</Text>
      <Text style={styles.desc}>Allow message requests from</Text>
      {loading ? (
        <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.messageRequestAudience === "EVERYONE"}
            title="Everyone (모든 사람)"
            description="누구나 새 메시지를 보낼 수 있습니다."
            disabled={busy}
            onPress={() => void save({ messageRequestAudience: "EVERYONE" })}
          />
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.messageRequestAudience === "FOLLOWING_ONLY"}
            title="No one (내가 팔로우하는 사람만)"
            description="내가 팔로우한 사람만 새 DM을 시작할 수 있습니다."
            disabled={busy}
            onPress={() => void save({ messageRequestAudience: "FOLLOWING_ONLY" })}
          />

          <Text style={[styles.title, styles.section]}>통화</Text>
          <Text style={styles.desc}>
            기본값은 On입니다. Off면 내가 팔로우한 사람만 전화를 걸 수 있습니다.
          </Text>
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.callRequestAudience === "EVERYONE"}
            title="On"
            description="모든 사람이 통화할 수 있습니다."
            disabled={busy}
            onPress={() => void save({ callRequestAudience: "EVERYONE" })}
          />
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.callRequestAudience === "FOLLOWING_ONLY"}
            title="Off"
            description="내가 팔로우한 사람만 통화할 수 있습니다."
            disabled={busy}
            onPress={() => void save({ callRequestAudience: "FOLLOWING_ONLY" })}
          />
        </>
      )}
    </FolkCard>
  );
}

function Radio({
  styles,
  colors,
  selected,
  title,
  description,
  disabled,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  selected: boolean;
  title: string;
  description: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.option, selected && styles.optionOn]}
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
    >
      <View style={[styles.dot, selected && { borderColor: colors.terracotta }]}>
        {selected ? <View style={[styles.dotFill, { backgroundColor: colors.terracotta }]} /> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 17, fontWeight: "800", color: colors.text },
    desc: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: spacing.sm, lineHeight: 18 },
    section: { marginTop: spacing.lg },
    option: {
      flexDirection: "row",
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: spacing.md,
      marginTop: spacing.sm,
    },
    optionOn: { borderColor: colors.terracotta, backgroundColor: colors.background },
    optionText: { flex: 1, gap: 2 },
    optionTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    optionDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 17 },
    dot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    dotFill: { width: 8, height: 8, borderRadius: 4 },
  });
}
