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
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type DrawerRoute =
  | "Home"
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
  | "EventsMap"
  | "Reels"
  | "LegalPolicies";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: DrawerRoute) => void;
};

type ExploreItem = {
  route: DrawerRoute;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
};

const EXPLORE: ExploreItem[] = [
  { route: "Home", label: "홈", icon: "home-outline", accent: true },
  { route: "LiveList", label: "라이브", icon: "radio-outline", accent: true },
  { route: "StarList", label: "STAR", icon: "star-outline" },
  { route: "CommunityList", label: "커뮤니티", icon: "people-outline" },
  { route: "AnimeList", label: "애니·위키", icon: "book-outline" },
  { route: "EventsList", label: "이벤트", icon: "calendar-outline" },
  { route: "EventsMap", label: "행사 지도", icon: "map-outline" },
  { route: "Wallet", label: "지갑", icon: "wallet-outline" },
];

const ACCENT_ICON = "#A78BFA";

function DrawerRow({
  label,
  icon,
  iconColor,
  labelColor,
  showChevron = true,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  labelColor: string;
  showChevron?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={stylesStatic.row} onPress={onPress} accessibilityRole="button">
      <Ionicons name={icon} size={22} color={iconColor} style={stylesStatic.rowIcon} />
      <Text style={[stylesStatic.rowLabel, { color: labelColor }]}>{label}</Text>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.35)" />
      ) : (
        <View style={stylesStatic.chevronSpacer} />
      )}
    </Pressable>
  );
}

export function SideDrawer({ visible, onClose, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, signOut } = useAuth();
  const display = useMemo(
    () => user?.name || user?.username || "MoCoMo",
    [user?.name, user?.username]
  );

  const go = (route: DrawerRoute) => {
    onClose();
    onNavigate(route);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View
          style={[
            styles.panel,
            { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 12 },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.profileCard}>
              <ProfileBannerMedia
                bannerUrl={user?.bannerUrl}
                bannerVideoUrl={user?.bannerVideoUrl}
                active={visible}
              />
              <View style={styles.profileBannerOverlay} pointerEvents="none" />
              <View style={styles.profileRow}>
                <FolkAvatar
                  uri={user?.image}
                  name={user?.name || user?.username}
                  size={52}
                  framed={false}
                />
                <View style={styles.profileMeta}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {display}
                  </Text>
                  <Text style={styles.profileHandle}>@{user?.username ?? "—"}</Text>
                  <View style={styles.stats}>
                    <Text style={styles.stat}>
                      <Text style={styles.statNum}>{user?.counts?.following ?? 0}</Text> 팔로잉
                    </Text>
                    <Text style={styles.stat}>
                      <Text style={styles.statNum}>{user?.counts?.followers ?? 0}</Text> 팔로워
                    </Text>
                  </View>
                </View>
                <Pressable
                  style={styles.editBtn}
                  onPress={() => go("Profile")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="프로필 편집"
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Explore</Text>
            {EXPLORE.map((item) => (
              <DrawerRow
                key={item.route}
                label={item.label}
                icon={item.icon}
                iconColor={item.accent ? ACCENT_ICON : "#F5F0E8"}
                labelColor="#F5F0E8"
                onPress={() => go(item.route)}
              />
            ))}

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>More</Text>

            <DrawerRow
              label="설정"
              icon="settings-outline"
              iconColor="#F5F0E8"
              labelColor="#F5F0E8"
              showChevron={false}
              onPress={() => go("Settings")}
            />
            <DrawerRow
              label="로그아웃"
              icon="log-out-outline"
              iconColor={colors.danger}
              labelColor={colors.danger}
              showChevron={false}
              onPress={() => {
                onClose();
                void signOut();
              }}
            />
            <DrawerRow
              label="약관 및 정책"
              icon="document-text-outline"
              iconColor="#F5F0E8"
              labelColor="#F5F0E8"
              onPress={() => go("LegalPolicies")}
            />

            <Pressable
              style={styles.promoBanner}
              onPress={() => go("EventsList")}
              accessibilityRole="button"
              accessibilityLabel="이벤트 등록"
            >
              <View style={styles.promoStars} pointerEvents="none" />
              <View style={styles.promoPlanet} pointerEvents="none" />
              <Text style={styles.promoLine1}>누구나 자유롭게</Text>
              <Text style={styles.promoLine2}>내 이벤트를 등록!</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const stylesStatic = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 2,
  },
  rowIcon: { width: 28 },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  chevronSpacer: { width: 18 },
});

function createStyles(colors: ThemeColors, isDark: boolean) {
  const panelBg = isDark ? "#0F1524" : colors.background;
  return StyleSheet.create({
    root: { flex: 1, flexDirection: "row" },
    scrim: { flex: 1, backgroundColor: "rgba(0,0,0,0.58)" },
    panel: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: "86%",
      maxWidth: 360,
      backgroundColor: panelBg,
      paddingHorizontal: spacing.md,
    },
    scroll: { paddingBottom: spacing.md },
    profileCard: {
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: isDark ? "#18243A" : colors.surfaceRaised,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      minHeight: 108,
    },
    profileBannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: spacing.md,
      zIndex: 1,
    },
    profileMeta: { flex: 1, minWidth: 0 },
    profileName: {
      color: "#F5F0E8",
      fontSize: 18,
      fontWeight: "800",
    },
    profileHandle: {
      marginTop: 2,
      color: "rgba(245, 240, 232, 0.55)",
      fontSize: 13,
      fontWeight: "600",
    },
    stats: { flexDirection: "row", gap: spacing.md, marginTop: 8 },
    stat: { color: "rgba(245, 240, 232, 0.72)", fontSize: 13, fontWeight: "600" },
    statNum: { fontWeight: "800", color: "#F5F0E8" },
    editBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: "rgba(255,255,255,0.1)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    sectionTitle: {
      color: "rgba(245, 240, 232, 0.45)",
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4,
      letterSpacing: 0.2,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: "rgba(255,255,255,0.08)",
      marginVertical: spacing.md,
    },
    promoBanner: {
      marginTop: spacing.lg,
      borderRadius: radii.lg,
      overflow: "hidden",
      minHeight: 96,
      paddingHorizontal: spacing.md,
      paddingVertical: 18,
      backgroundColor: "#0A0E18",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.08)",
      justifyContent: "center",
    },
    promoStars: {
      ...StyleSheet.absoluteFill,
      backgroundColor: "#0A0E18",
      opacity: 0.95,
    },
    promoPlanet: {
      position: "absolute",
      left: -36,
      bottom: -48,
      width: 160,
      height: 160,
      borderRadius: 80,
      backgroundColor: "rgba(207, 102, 64, 0.55)",
      borderWidth: 2,
      borderColor: "rgba(255, 180, 120, 0.35)",
    },
    promoLine1: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 14,
      fontWeight: "600",
      zIndex: 1,
    },
    promoLine2: {
      marginTop: 4,
      color: "#FFB86A",
      fontSize: 18,
      fontWeight: "900",
      zIndex: 1,
    },
  });
}
