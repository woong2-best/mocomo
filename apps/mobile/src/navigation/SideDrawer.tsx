import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { prefetchDrawerRoute, warmDrawerBundles } from "@/navigation/tab-warmup";
import type { DrawerRoute } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export type { DrawerRoute } from "@/navigation/types";

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
const OPEN_MS = 280;
const CLOSE_MS = 220;

function DrawerRow({
  label,
  icon,
  iconColor,
  labelColor,
  chevronColor,
  showChevron = true,
  onPressIn,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  labelColor: string;
  chevronColor: string;
  showChevron?: boolean;
  onPressIn?: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={stylesStatic.row}
      onPressIn={onPressIn}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={22} color={iconColor} style={stylesStatic.rowIcon} />
      <Text style={[stylesStatic.rowLabel, { color: labelColor }]}>{label}</Text>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={chevronColor} />
      ) : (
        <View style={stylesStatic.chevronSpacer} />
      )}
    </Pressable>
  );
}

export function SideDrawer({ visible, onClose, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const panelWidth = Math.min(Math.round(screenW * 0.86), 360);
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, signOut } = useAuth();
  const display = useMemo(
    () => user?.name || user?.username || "MoCoMo",
    [user?.name, user?.username]
  );

  const [presented, setPresented] = useState(false);
  const slideX = useRef(new Animated.Value(-360)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      warmDrawerBundles();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setPresented(true);
      slideX.setValue(-panelWidth);
      scrimOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: OPEN_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: OPEN_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!presented) return;

    Animated.parallel([
      Animated.timing(slideX, {
        toValue: -panelWidth,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: CLOSE_MS,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setPresented(false);
    });
  }, [panelWidth, presented, scrimOpacity, slideX, visible]);

  const prefetch = (route: DrawerRoute) => {
    prefetchDrawerRoute(queryClient, route);
  };

  const go = (route: DrawerRoute) => {
    onClose();
    onNavigate(route);
  };

  const rowLabel = colors.text;
  const rowIcon = colors.text;
  const rowChevron = colors.textMuted;

  return (
    <Modal visible={presented} animationType="none" transparent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.scrimWrap, { opacity: scrimOpacity }]}>
          <Pressable style={styles.scrim} onPress={onClose} accessibilityRole="button" />
        </Animated.View>
        <Animated.View
          style={[
            styles.panel,
            {
              width: panelWidth,
              paddingTop: insets.top + 10,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateX: slideX }],
            },
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
                  onPressIn={() => prefetch("ProfileEdit")}
                  onPress={() => go("ProfileEdit")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="프로필 수정"
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
                iconColor={item.accent ? ACCENT_ICON : rowIcon}
                labelColor={rowLabel}
                chevronColor={rowChevron}
                onPressIn={() => prefetch(item.route)}
                onPress={() => go(item.route)}
              />
            ))}

            <View style={styles.sectionDivider} />
            <Text style={styles.sectionTitle}>More</Text>

            <DrawerRow
              label="설정"
              icon="settings-outline"
              iconColor={rowIcon}
              labelColor={rowLabel}
              chevronColor={rowChevron}
              showChevron={false}
              onPressIn={() => prefetch("Settings")}
              onPress={() => go("Settings")}
            />
            <DrawerRow
              label="로그아웃"
              icon="log-out-outline"
              iconColor={colors.danger}
              labelColor={colors.danger}
              chevronColor={rowChevron}
              showChevron={false}
              onPress={() => {
                onClose();
                void signOut();
              }}
            />
            <DrawerRow
              label="약관 및 정책"
              icon="document-text-outline"
              iconColor={rowIcon}
              labelColor={rowLabel}
              chevronColor={rowChevron}
              onPressIn={() => prefetch("LegalPolicies")}
              onPress={() => go("LegalPolicies")}
            />

            <Pressable
              style={styles.promoBanner}
              onPressIn={() => prefetch("EventsList")}
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
        </Animated.View>
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
  const profileOnBanner = colors.textOnAccent;
  const profileMutedOnBanner = isDark
    ? "rgba(245, 240, 232, 0.55)"
    : "rgba(255, 251, 245, 0.72)";
  const profileStatOnBanner = isDark
    ? "rgba(245, 240, 232, 0.72)"
    : "rgba(255, 251, 245, 0.85)";

  return StyleSheet.create({
    root: { flex: 1 },
    scrimWrap: {
      ...StyleSheet.absoluteFill,
    },
    scrim: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.58)",
    },
    panel: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: panelBg,
      paddingHorizontal: spacing.md,
      zIndex: 2,
      elevation: 8,
    },
    scroll: { paddingBottom: spacing.md },
    profileCard: {
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: isDark ? "#18243A" : colors.surfaceRaised,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : colors.hairline,
      minHeight: 108,
    },
    profileBannerOverlay: {
      ...StyleSheet.absoluteFill,
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
      color: profileOnBanner,
      fontSize: 18,
      fontWeight: "800",
    },
    profileHandle: {
      marginTop: 2,
      color: profileMutedOnBanner,
      fontSize: 13,
      fontWeight: "600",
    },
    stats: { flexDirection: "row", gap: spacing.md, marginTop: 8 },
    stat: { color: profileStatOnBanner, fontSize: 13, fontWeight: "600" },
    statNum: { fontWeight: "800", color: profileOnBanner },
    editBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.28)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.25)",
    },
    sectionTitle: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4,
      letterSpacing: 0.2,
    },
    sectionDivider: {
      height: 1,
      backgroundColor: colors.hairline,
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
