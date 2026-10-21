import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Switch, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotificationSettings,
  saveNotificationSettings,
  type NotificationSettings,
} from "@/api/notification-settings";
import { AppHeader } from "@/ui/AppHeader";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";
import { ApiError } from "@/api/client";

const QUERY_KEY = ["mobile-notification-settings"] as const;

type ToggleKey = keyof NotificationSettings;

export function NotificationSettingsScreen() {
  const { t } = useI18n();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: fetchNotificationSettings });
  const [pending, setPending] = useState<ToggleKey | null>(null);

  const settings = query.data;

  const onToggle = useCallback(
    async (key: ToggleKey, value: boolean) => {
      if (!settings) return;
      const prev = settings[key];
      queryClient.setQueryData(QUERY_KEY, { ...settings, [key]: value });
      setPending(key);
      try {
        const next = await saveNotificationSettings({ [key]: value });
        queryClient.setQueryData(QUERY_KEY, next);
      } catch (e) {
        queryClient.setQueryData(QUERY_KEY, { ...settings, [key]: prev });
        showIslandError(t("m.common.error"), errorMessage(e, t));
      } finally {
        setPending(null);
      }
    },
    [queryClient, settings, t]
  );

  const rows: { key: ToggleKey; label: string; hint?: string; disabled?: boolean }[] = [
    {
      key: "pushNotificationsEnabled",
      label: t("m.settings.notifications.push_all"),
      hint: t("m.settings.notifications.push_all_hint"),
    },
    {
      key: "notifyDirectMessages",
      label: t("m.settings.notifications.direct_messages"),
      disabled: settings?.pushNotificationsEnabled === false,
    },
    {
      key: "notifyMentionsReplies",
      label: t("m.settings.notifications.mentions_replies"),
      disabled: settings?.pushNotificationsEnabled === false,
    },
    {
      key: "notifyLikesInteractions",
      label: t("m.settings.notifications.likes_interactions"),
      disabled: settings?.pushNotificationsEnabled === false,
    },
    {
      key: "notifyGroupMessages",
      label: t("m.settings.notifications.group_messages"),
      disabled: settings?.pushNotificationsEnabled === false,
    },
  ];

  return (
    <Screen>
      <AppHeader
        title={t("m.settings.notifications.title")}
        leftLabel={t("m.common.back")}
        onLeftPress={() => navigation.goBack()}
      />
      {query.isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.terracotta} />
      ) : query.isError || !settings ? (
        <View style={styles.center}>
          <Text style={styles.error}>{t("m.common.error")}</Text>
        </View>
      ) : (
        <View style={styles.body}>
          <FolkCard>
            <Text style={styles.cardTitle}>{t("m.settings.notifications.title")}</Text>
            <Text style={styles.cardDesc}>{t("m.settings.notifications.subtitle")}</Text>
            {rows.map((row, index) => (
              <View
                key={row.key}
                style={[styles.row, index < rows.length - 1 && styles.rowBorder]}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.hint ? <Text style={styles.rowHint}>{row.hint}</Text> : null}
                </View>
                <Switch
                  value={settings[row.key]}
                  onValueChange={(v) => void onToggle(row.key, v)}
                  disabled={row.disabled || pending === row.key}
                  trackColor={{ false: colors.muted, true: colors.cobalt }}
                  thumbColor={colors.surfaceRaised}
                />
              </View>
            ))}
          </FolkCard>
        </View>
      )}
    </Screen>
  );
}

function errorMessage(e: unknown, t: TFn) {
  if (e instanceof ApiError) return e.message;
  return t("m.common.try_again");
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, paddingBottom: 48 },
    center: { padding: spacing.lg, alignItems: "center" },
    error: { color: colors.danger, fontWeight: "600" },
    cardTitle: { fontWeight: "900", fontSize: 17, color: colors.cobalt },
    cardDesc: {
      marginTop: 6,
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: spacing.sm,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: "rgba(27, 74, 140, 0.12)",
    },
    rowCopy: { flex: 1, minWidth: 0 },
    rowLabel: { fontWeight: "800", color: colors.text, fontSize: 15 },
    rowHint: { marginTop: 4, color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  });
}
