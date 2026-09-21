import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/auth/AuthContext";
import { AccountsBottomSheet } from "@/features/account/AccountMenuSheet";
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
  { route: "LiveList", label: "라이브", icon: "radio-outline", accent: true },
  { route: "Used", label: "마켓", icon: "storefront-outline", accent: true },
  { route: "Messages", label: "메세지", icon: "paper-plane-outline", accent: true },
  { route: "StarList", label: "STAR", icon: "star-outline" },
  { route: "CommunityList", label: "커뮤니티", icon: "people-outline" },
  { route: "AnimeList", label: "컬쳐 위키", icon: "book-outline" },
  { route: "EventsMap", label: "서브컬처 맵", icon: "map-outline" },
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
      style={({ pressed }) => [stylesStatic.row, pressed && stylesStatic.rowPressed]}
      onPressIn={() => {
        void Haptics.selectionAsync();
        onPressIn?.();
      }}
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
  const { user, signOut, addAccount } = useAuth();
  const display = useMemo(
    () => user?.name || user?.username || "MoCoMo",
    [user?.name, user?.username]
  );

  const [accountSheetOpen, setAccountSheetOpen] = useState(false);

  const [presented, setPresented] = useState(false);
  const slideX = useRef(new Animated.Value(-360)).current;

  /**
   * Scrim/blur opacity is derived from the same slideX progress — one native
   * animation drives both panel motion and backdrop fade (no parallel desync).
   */
  const backdropOpacity = slideX.interpolate({
    inputRange: [-panelWidth, 0],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const closeAccountSheet = () => setAccountSheetOpen(false);

  useEffect(() => {
    if (visible) {
      warmDrawerBundles();
    } else {
      // Drawer closing → always tear down account overlay (prevents sticky cards)
      setAccountSheetOpen(false);
    }
  }, [visible]);

  // Only hard-background — `inactive` on Android fires during Modals/alerts and was
  // immediately killing the account sheet (looked like "doesn't open").
  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === "background") {
        setAccountSheetOpen(false);
      }
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      setPresented(true);
      slideX.setValue(-panelWidth);
      Animated.timing(slideX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (!presented) return;

    setAccountSheetOpen(false);
    Animated.timing(slideX, {
      toValue: -panelWidth,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setPresented(false);
    });
  }, [panelWidth, presented, slideX, visible]);

  const prefetch = (route: DrawerRoute) => {
    prefetchDrawerRoute(queryClient, route);
  };

  const go = (route: DrawerRoute) => {
    setAccountSheetOpen(false);
    onClose();
    onNavigate(route);
  };

  const handleDrawerClose = () => {
    setAccountSheetOpen(false);
    onClose();
  };

  const rowLabel = colors.text;
  const rowIcon = colors.text;
  const rowChevron = colors.textMuted;

  return (
    <>
    <Modal
      visible={presented}
      animationType="none"
      transparent
      onRequestClose={handleDrawerClose}
      // Avoid weird OS recents thumbnails from nested overlay compositing
      statusBarTranslucent
    >
      <View style={styles.root} collapsable={false}>
        {/*
          Fixed-intensity BlurView + dim; opacity driven by slideX on the
          native driver so blur never recomputes intensity mid-frame.
        */}
        <Animated.View
          style={[styles.scrimWrap, { opacity: backdropOpacity }]}
          pointerEvents="none"
        >
          <BlurView
            intensity={isDark ? 55 : 65}
            tint={isDark ? "dark" : "light"}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: isDark
                  ? "rgba(8, 10, 14, 0.45)"
                  : "rgba(0, 0, 0, 0.38)",
              },
            ]}
            pointerEvents="none"
          />
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
          <View style={styles.panelBody}>
            <View style={styles.profileCard}>
              <ProfileBannerMedia
                bannerUrl={user?.bannerUrl}
                bannerVideoUrl={user?.bannerVideoUrl}
                active={visible && !accountSheetOpen}
              />
              <View style={styles.profileBannerOverlay} pointerEvents="none" />
              <View style={styles.profileRow}>
                <Pressable
                  style={styles.profileTapArea}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAccountSheetOpen(true);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="계정 전환"
                >
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
                </Pressable>
                <Pressable
                  style={styles.editBtn}
                  onPressIn={() => {
                    void Haptics.selectionAsync();
                    prefetch("ProfileEdit");
                  }}
                  onPress={() => go("ProfileEdit")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="프로필 수정"
                >
                  <Ionicons name="pencil" size={16} color="#fff" />
                </Pressable>
              </View>
            </View>

            <View style={styles.menuBlock}>
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
                label="약관 및 정책"
                icon="document-text-outline"
                iconColor={rowIcon}
                labelColor={rowLabel}
                chevronColor={rowChevron}
                onPressIn={() => prefetch("LegalPolicies")}
                onPress={() => go("LegalPolicies")}
              />
            </View>

            <Pressable
              style={styles.promoBanner}
              onPressIn={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                prefetch("EventsList");
              }}
              onPress={() => go("EventsList")}
              accessibilityRole="button"
              accessibilityLabel="이벤트 등록"
            >
              <View style={styles.promoStars} pointerEvents="none" />
              <View style={styles.promoPlanet} pointerEvents="none" />
              <Text style={styles.promoLine1}>누구나 자유롭게</Text>
              <Text style={styles.promoLine2}>내 이벤트를 등록!</Text>
            </Pressable>
          </View>
        </Animated.View>
        {/* Above panel z-index; BlurView on Android can swallow scrim taps */}
        <Pressable
          style={[styles.marginDismiss, { left: panelWidth }]}
          onPress={handleDrawerClose}
          accessibilityRole="button"
          accessibilityLabel="메뉴 닫기"
        />
      </View>
    </Modal>

    {/* Own top-level Modal — must not inherit drawer panel layout/scroll coords */}
    <AccountsBottomSheet
      visible={accountSheetOpen}
      onClose={closeAccountSheet}
      onCreateNew={() => {
        setAccountSheetOpen(false);
        onClose();
        void addAccount("signup");
      }}
      onAddExisting={() => {
        setAccountSheetOpen(false);
        onClose();
        void addAccount("signin");
      }}
      onLogout={() => {
        setAccountSheetOpen(false);
        onClose();
        void signOut();
      }}
    />
    </>
  );
}

const stylesStatic = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 2,
  },
  rowPressed: {
    opacity: 0.72,
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
      ...StyleSheet.absoluteFillObject,
    },
    marginDismiss: {
      position: "absolute",
      top: 0,
      right: 0,
      bottom: 0,
      zIndex: 3,
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
    panelBody: {
      flex: 1,
    },
    menuBlock: {
      flex: 1,
    },
    profileCard: {
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: isDark ? "#141820" : colors.surfaceRaised,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: isDark ? "rgba(180, 210, 255, 0.28)" : colors.hairline,
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
    profileTapArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
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
