import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";

export type DrawerRoute =
  | "Profile"
  | "Settings"
  | "StarList"
  | "CommunityList"
  | "Wallet"
  | "GamesHub"
  | "AnimeList"
  | "MarketplaceList"
  | "SellerListings"
  | "LiveList"
  | "Discover"
  | "Market"
  | "Messages"
  | "Search"
  | "Activity"
  | "EventsList"
  | "Reels";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: DrawerRoute) => void;
};

const MAIN: { route: DrawerRoute; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: "Profile", label: "프로필", icon: "person-outline" },
  { route: "LiveList", label: "라이브", icon: "radio-outline" },
  { route: "StarList", label: "STAR", icon: "star-outline" },
  { route: "CommunityList", label: "커뮤니티", icon: "people-outline" },
  { route: "AnimeList", label: "애니·위키", icon: "book-outline" },
  { route: "EventsList", label: "이벤트", icon: "calendar-outline" },
  { route: "Wallet", label: "지갑", icon: "wallet-outline" },
];

export function SideDrawer({ visible, onClose, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, signOut } = useAuth();
  const display = useMemo(
    () => user?.name || user?.username || "MoCoMo",
    [user?.name, user?.username]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.panel,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.profileBlock}>
              <FolkAvatar
                uri={user?.image}
                name={user?.name || user?.username}
                size={56}
                style={{ marginBottom: spacing.sm }}
              />
              <Text style={styles.name}>{display}</Text>
              <Text style={styles.handle}>@{user?.username ?? "—"}</Text>
              <View style={styles.stats}>
                <Text style={styles.stat}>
                  <Text style={styles.statNum}>{user?.counts?.following ?? 0}</Text> 팔로잉
                </Text>
                <Text style={styles.stat}>
                  <Text style={styles.statNum}>{user?.counts?.followers ?? 0}</Text> 팔로워
                </Text>
              </View>
            </View>

            {MAIN.map((item) => (
              <Pressable
                key={item.route}
                style={styles.row}
                onPress={() => {
                  onClose();
                  onNavigate(item.route);
                }}
              >
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={20} color={colors.brand} />
                </View>
                <Text style={styles.rowLabel}>{item.label}</Text>
              </Pressable>
            ))}

            <View style={styles.divider} />

            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                onNavigate("Settings");
              }}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="settings-outline" size={20} color={colors.brand} />
              </View>
              <Text style={styles.rowLabel}>설정</Text>
            </Pressable>

            <Pressable
              style={styles.row}
              onPress={() => {
                onClose();
                void signOut();
              }}
            >
              <View style={[styles.iconWrap, { backgroundColor: "rgba(179,58,31,0.12)" }]}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.danger }]}>로그아웃</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  const hair = colors.hairline;
  return StyleSheet.create({
    root: { flex: 1, flexDirection: "row" },
    scrim: { flex: 1, backgroundColor: isDark ? "rgba(0,0,0,0.55)" : "rgba(20, 40, 72, 0.35)" },
    panel: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "84%",
      maxWidth: 340,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      borderRightWidth: 2,
      borderRightColor: hair,
      ...shadows.soft,
    },
    profileBlock: {
      paddingBottom: spacing.md,
      paddingTop: spacing.sm,
      marginBottom: spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: hair,
    },
    name: { fontSize: 20, fontWeight: "800", color: colors.brand },
    handle: { marginTop: 2, color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    stats: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
    stat: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },
    statNum: { fontWeight: "800", color: colors.text },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 10,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.muted,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: hair,
    },
    rowLabel: { fontSize: 17, fontWeight: "800", color: colors.brand },
    divider: {
      height: 2,
      backgroundColor: hair,
      marginVertical: spacing.sm,
    },
  });
}
