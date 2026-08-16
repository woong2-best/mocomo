import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import type { SavedMobileAccountPublic } from "@/auth/account-store";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing } from "@/theme/tokens";

export type AccountMenuAction =
  | "accounts"
  | "messages"
  | "profile"
  | "settings"
  | "rank"
  | "logout";

type MenuProps = {
  visible: boolean;
  onClose: () => void;
  onAction: (action: AccountMenuAction) => void;
};

/** Web profile dropdown: Accounts · 쪽지 · 내 프로필 · 설정 · 등급 · 로그아웃 */
export function AccountMenuSheet({ visible, onClose, onAction }: MenuProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const rows: {
    action: AccountMenuAction;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    danger?: boolean;
    sepBefore?: boolean;
  }[] = [
    { action: "accounts", label: "Accounts", icon: "people-outline" },
    { action: "messages", label: "쪽지", icon: "chatbubble-outline", sepBefore: true },
    { action: "profile", label: "내 프로필", icon: "person-outline" },
    { action: "settings", label: "설정", icon: "settings-outline" },
    { action: "rank", label: "등급", icon: "diamond-outline" },
    { action: "logout", label: "로그아웃", icon: "log-out-outline", danger: true, sepBefore: true },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <View
          style={[
            styles.card,
            {
              top: insets.top + 52,
              backgroundColor: colors.surfaceRaised,
              borderColor: colors.hairline,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          {rows.map((item) => (
            <View key={item.action}>
              {item.sepBefore ? (
                <View style={[styles.sep, { backgroundColor: colors.hairline }]} />
              ) : null}
              <Pressable
                style={styles.row}
                onPress={() => {
                  onClose();
                  onAction(item.action);
                }}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? colors.terracotta : colors.brand}
                />
                <Text
                  style={[
                    styles.label,
                    { color: item.danger ? colors.terracotta : colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

type AccountsProps = {
  visible: boolean;
  onClose: () => void;
  onCreateNew: () => void;
  onAddExisting: () => void;
};

/** Web Accounts bottom sheet */
export function AccountsBottomSheet({
  visible,
  onClose,
  onCreateNew,
  onAddExisting,
}: AccountsProps) {
  const { colors } = useTheme();
  const { user, savedAccounts, switchAccount, refreshSavedAccounts } = useAuth();
  const insets = useSafeAreaInsets();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    setError("");
    void refreshSavedAccounts();
  }, [refreshSavedAccounts, visible]);

  const accounts: SavedMobileAccountPublic[] = (() => {
    const map = new Map<string, SavedMobileAccountPublic>();
    for (const a of savedAccounts) map.set(a.userId, a);
    if (user && !map.has(user.id)) {
      map.set(user.id, {
        userId: user.id,
        username: user.username,
        name: user.name,
        image: user.image,
        savedAt: Date.now(),
      });
    }
    return [...map.values()].sort((a, b) => b.savedAt - a.savedAt);
  })();

  const onSwitch = (account: SavedMobileAccountPublic) => {
    if (account.userId === user?.id) {
      onClose();
      return;
    }
    setBusyId(account.userId);
    setError("");
    void switchAccount(account.userId)
      .then(() => onClose())
      .catch(() => setError("계정을 전환할 수 없습니다."))
      .finally(() => setBusyId(null));
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable style={styles.sheetScrim} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.background,
              paddingBottom: insets.bottom + 16,
              borderColor: colors.hairline,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.sheetTitle, { color: colors.brand }]}>Accounts</Text>

          {accounts.map((account) => {
            const isActive = account.userId === user?.id;
            return (
              <Pressable
                key={account.userId}
                style={[styles.accountRow, { borderColor: colors.hairline }]}
                onPress={() => onSwitch(account)}
                disabled={busyId !== null}
              >
                <FolkAvatar
                  uri={account.image}
                  name={account.name || account.username}
                  size={44}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.accountName, { color: colors.text }]}>
                    {account.name || account.username}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                    @{account.username}
                  </Text>
                </View>
                {busyId === account.userId ? (
                  <ActivityIndicator color={colors.terracotta} />
                ) : isActive ? (
                  <Ionicons name="checkmark-circle" size={24} color={colors.terracotta} />
                ) : null}
              </Pressable>
            );
          })}

          {error ? (
            <Text style={{ color: colors.danger, marginBottom: 8, fontWeight: "600" }}>
              {error}
            </Text>
          ) : null}

          <Pressable
            style={[styles.outlineBtn, { borderColor: colors.brand }]}
            onPress={onCreateNew}
          >
            <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
              Create new account
            </Text>
          </Pressable>
          <Pressable
            style={[styles.outlineBtn, { borderColor: colors.brand, marginTop: 10 }]}
            onPress={onAddExisting}
          >
            <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
              Add existing account
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.25)" },
  card: {
    position: "absolute",
    right: 12,
    width: 220,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    paddingVertical: 6,
    ...shadows.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  label: { fontSize: 15, fontWeight: "700" },
  sep: { height: StyleSheet.hairlineWidth, marginVertical: 4, marginHorizontal: 10 },
  sheetRoot: { flex: 1, justifyContent: "flex-end" },
  sheetScrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 20, fontWeight: "800", marginBottom: 16 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  accountName: { fontSize: 16, fontWeight: "800" },
  outlineBtn: {
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  outlineBtnText: { fontWeight: "800", fontSize: 15 },
});
