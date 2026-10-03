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
import { useI18n } from "@/i18n/I18nProvider";

const DEFAULTS: ContactSettings = {
  messageRequestAudience: "EVERYONE",
  callRequestAudience: "EVERYONE",
};

export function ContactAudienceSettingsCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<ContactSettings>(DEFAULTS);

  useEffect(() => {
    void fetchContactSettings()
      .then(setSettings)
      .catch(() => showIslandError(t("m.common.error"), t("m.settings.could_not_load_settings")))
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
      showIslandError(t("m.common.error"), e instanceof Error ? e.message : t("m.common.could_not_save"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FolkCard>
      <Text style={styles.title}>{t("m.settings.who_can_message_you")}</Text>
      <Text style={styles.desc}>Allow message requests from</Text>
      {loading ? (
        <ActivityIndicator color={colors.terracotta} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.messageRequestAudience === "EVERYONE"}
            title={t("m.settings.everyone")}
            description={t("m.settings.anyone_can_send_you_a_new")}
            disabled={busy}
            onPress={() => void save({ messageRequestAudience: "EVERYONE" })}
          />
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.messageRequestAudience === "FOLLOWING_ONLY"}
            title={t("m.settings.people_i_follow_only")}
            description={t("m.settings.only_people_you_follow_can_start")}
            disabled={busy}
            onPress={() => void save({ messageRequestAudience: "FOLLOWING_ONLY" })}
          />

          <Text style={[styles.title, styles.section]}>{t("m.settings.calls")}</Text>
          <Text style={styles.desc}>
            {t("m.settings.default_is_on_when_off_only")}
          </Text>
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.callRequestAudience === "EVERYONE"}
            title="On"
            description={t("m.settings.anyone_can_call_you")}
            disabled={busy}
            onPress={() => void save({ callRequestAudience: "EVERYONE" })}
          />
          <Radio
            styles={styles}
            colors={colors}
            selected={settings.callRequestAudience === "FOLLOWING_ONLY"}
            title="Off"
            description={t("m.settings.only_people_you_follow_can_call")}
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
