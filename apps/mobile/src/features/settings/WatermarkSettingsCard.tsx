import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthContext";
import { patchMe } from "@/api/discovery";
import { ApiError } from "@/api/client";
import { FolkCard } from "@/ui/FolkCard";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import {
  isWatermarkPlacement,
  type WatermarkPlacement,
} from "@/lib/media-watermark";
import { useI18n } from "@/i18n/I18nProvider";
import { translate } from "@/i18n/runtime";

export function WatermarkSettingsCard() {
  const { t } = useI18n();
  const { user, refreshMe } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [enabled, setEnabled] = useState(false);
  const [placement, setPlacement] = useState<WatermarkPlacement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const prefs = user?.preferences;
    setEnabled(prefs?.watermarkInsertEnabled === true);
    setPlacement(
      isWatermarkPlacement(prefs?.watermarkPlacement) ? prefs.watermarkPlacement : null
    );
    setLoading(false);
  }, [user?.preferences?.watermarkInsertEnabled, user?.preferences?.watermarkPlacement]);

  const save = useCallback(
    async (patch: { watermarkInsertEnabled?: boolean; watermarkPlacement?: WatermarkPlacement | null }) => {
      try {
        await patchMe(patch);
        await refreshMe();
      } catch (e) {
        showIslandError(t("m.common.error"), errorMessage(e));
        throw e;
      }
    },
    [refreshMe]
  );

  if (!user?.id) return null;

  return (
    <FolkCard>
      <Text style={styles.cardTitle}>{t("m.compose.watermark")}</Text>
      <Text style={styles.cardDesc}>
        {t("m.settings.choose_whether_to_add_a_watermark")}
      </Text>

      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.rowTitle}>{t("m.settings.add_watermark")}</Text>
          <Text style={styles.rowSub}>{enabled ? "On" : "Off"}</Text>
        </View>
        <Switch
          value={enabled}
          disabled={loading}
          onValueChange={(v) => {
            const prev = enabled;
            setEnabled(v);
            void save({ watermarkInsertEnabled: v }).catch(() => setEnabled(prev));
          }}
          trackColor={{ false: colors.border, true: colors.cobalt }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.choiceRow}>
        {(
          [
            { id: "corner" as const, label: t("m.settings.bottom_corner") },
            { id: "diagonal" as const, label: t("m.common.all") },
          ] as const
        ).map((opt) => {
          const active = enabled && placement === opt.id;
          return (
            <Pressable
              key={opt.id}
              disabled={!enabled || loading}
              onPress={() => {
                const prev = placement;
                setPlacement(opt.id);
                void save({
                  watermarkInsertEnabled: true,
                  watermarkPlacement: opt.id,
                }).catch(() => setPlacement(prev));
              }}
              style={[
                styles.choice,
                {
                  opacity: enabled ? 1 : 0.32,
                  borderColor: active ? colors.terracotta : colors.border,
                  backgroundColor: active ? colors.terracotta : colors.surfaceRaised,
                },
              ]}
            >
              <Text
                style={[
                  styles.choiceLabel,
                  { color: active ? "#fff" : colors.textSecondary, fontWeight: active ? "800" : "600" },
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </FolkCard>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return translate("m.settings.could_not_save_settings");
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: 8,
    },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
    rowSub: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
    choiceRow: { flexDirection: "row", gap: 8, marginTop: 8 },
    choice: {
      flex: 1,
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
    },
    choiceLabel: { fontSize: 14 },
  });
}
