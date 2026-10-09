import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchBlockedUsers, unblockUser, type BlockedUserRow } from "@/api/social";
import { FolkCard } from "@/ui/FolkCard";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { showIslandError, showIslandSuccess } from "@/ui/IslandToast";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const ROW_HEIGHT = 56;
const VISIBLE_ROWS = 5;

export function BlockedUsersCard() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [users, setUsers] = useState<BlockedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchBlockedUsers();
      setUsers(rows);
    } catch (e) {
      showIslandError(
        t("m.common.error"),
        e instanceof Error ? e.message : t("m.settings.could_not_load_settings")
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onUnblock(user: BlockedUserRow) {
    if (pendingId) return;
    setPendingId(user.id);
    try {
      await unblockUser(user.id);
      setUsers((prev) => prev.filter((row) => row.id !== user.id));
      showIslandSuccess(t("m.settings.unblocked"));
    } catch (e) {
      showIslandError(
        t("m.common.error"),
        e instanceof Error ? e.message : t("m.settings.could_not_unblock")
      );
    } finally {
      setPendingId(null);
    }
  }

  return (
    <FolkCard>
      <Text style={styles.title}>{t("m.settings.blocked_accounts")}</Text>
      <Text style={styles.desc}>{t("m.settings.blocked_accounts_desc")}</Text>
      {loading ? (
        <ActivityIndicator color={colors.cobalt} style={{ marginVertical: spacing.md }} />
      ) : users.length === 0 ? (
        <Text style={styles.empty}>{t("m.settings.no_blocked_accounts")}</Text>
      ) : (
        <ScrollView
          style={[styles.list, users.length > VISIBLE_ROWS ? { maxHeight: ROW_HEIGHT * VISIBLE_ROWS } : null]}
          nestedScrollEnabled
        >
          {users.map((user) => {
            const display = user.name?.trim() || user.username;
            const busy = pendingId === user.id;
            return (
              <View key={user.id} style={styles.row}>
                <FolkAvatar uri={user.image} name={display} size={40} />
                <View style={styles.meta}>
                  <Text style={styles.name} numberOfLines={1}>
                    {display}
                  </Text>
                  <Text style={styles.handle} numberOfLines={1}>
                    @{user.username}
                  </Text>
                </View>
                <Pressable
                  style={styles.unblock}
                  onPress={() => void onUnblock(user)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={colors.cobalt} />
                  ) : (
                    <Text style={styles.unblockText}>{t("m.settings.unblock")}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </FolkCard>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    title: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    desc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    empty: { color: colors.textMuted, fontSize: 13, fontWeight: "600", paddingVertical: 8 },
    list: { marginHorizontal: -4 },
    row: {
      minHeight: ROW_HEIGHT,
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      paddingVertical: 8,
    },
    meta: { flex: 1, minWidth: 0 },
    name: { fontSize: 15, fontWeight: "800", color: colors.text },
    handle: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
    unblock: {
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      paddingVertical: 7,
      minWidth: 72,
      alignItems: "center",
    },
    unblockText: { fontSize: 12, fontWeight: "700", color: colors.cobalt },
  });
}
