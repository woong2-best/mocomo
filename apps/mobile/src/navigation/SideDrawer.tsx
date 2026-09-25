import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  type AppStateStatus,
  Easing,
  Linking,
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
import type { FollowListTab } from "@/api/social";
import { AccountsBottomSheet } from "@/features/account/AccountMenuSheet";
import { ProfileFollowListSheet } from "@/features/profile/ProfileFollowListSheet";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { API_BASE_URL } from "@/config/env";
import { DrawerSubcultureMapCard } from "@/navigation/DrawerSubcultureMapCard";
import { prefetchDrawerRoute, warmDrawerBundles } from "@/navigation/tab-warmup";
import type { DrawerRoute } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { FOLK_EXPLORE_ACCENT, radii, spacing, type ThemeColors } from "@/theme/tokens";

/** Web `/events/new` — 광고 등록 (EventCreateForm, MOCO 일당 과금). */
const AD_REGISTER_URL = `${API_BASE_URL.replace(/\/$/, "")}/events/new`;

export type { DrawerRoute } from "@/navigation/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: DrawerRoute) => void;
  onAddAccountLogin?: (intent: "signin" | "signup") => void;
};

type ExploreItem =
  | {
      route: DrawerRoute;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      accent?: boolean;
    }
  | {
      externalUrl: string;
      label: string;
      icon: keyof typeof Ionicons.glyphMap;
      accent?: boolean;
    };

const EXPLORE: ExploreItem[] = [
  { route: "LiveList", label: "라이브", icon: "radio-outline", accent: true },
  { route: "Used", label: "마켓", icon: "cart-outline", accent: true },
  { route: "StarList", label: "STAR", icon: "star-outline" },
  { route: "CommunityList", label: "QnA", icon: "people-outline" },
  { route: "AnimeList", label: "컬쳐 위키", icon: "book-outline" },
  { externalUrl: AD_REGISTER_URL, label: "Ad", icon: "megaphone-outline", accent: true },
  { route: "Wallet", label: "지갑", icon: "wallet-outline" },
];

const OPEN_MS = 280;
const CLOSE_MS = 220;

function DrawerRow({
  label,
  icon,
  iconColor,
  labelColor,
  chevronColor,
  showChevron = true,
  rowHeight,
  onPressIn,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  labelColor: string;
  chevronColor: string;
  showChevron?: boolean;
  rowHeight: number;
  onPressIn?: () => void;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        stylesStatic.row,
        { height: rowHeight },
        pressed && stylesStatic.rowPressed,
      ]}
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

export function SideDrawer({ visible, onClose, onNavigate, onAddAccountLogin }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const panelWidth = Math.min(Math.round(screenW * 0.86), 360);
  const innerH = Math.max(320, screenH - insets.top - insets.bottom - 22);
  const layout = useMemo(() => {
    /** Wide banner 3:1 — never stretch to phone portrait. */
    const profileH = Math.round(panelWidth / 3);
    const MIN_MAP = 140;
    const titleH = 22;
    let rowH = 42;
    let exploreH = titleH + EXPLORE.length * rowH;
    let leftover = innerH - exploreH - profileH - 10;
    if (leftover < MIN_MAP) {
      rowH = Math.max(34, Math.floor((innerH - profileH - MIN_MAP - titleH - 10) / EXPLORE.length));
      exploreH = titleH + EXPLORE.length * rowH;
      leftover = innerH - exploreH - profileH - 10;
    }
    const mapH = Math.max(MIN_MAP, leftover) + insets.bottom + 12;
    return { rowH, mapH };
  }, [innerH, panelWidth, insets.bottom]);
  const queryClient = useQueryClient();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { user, signOut } = useAuth();
  const display = useMemo(
    () => user?.name || user?.username || "MoCoMo",
    [user?.name, user?.username]
  );

  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [followListTab, setFollowListTab] = useState<FollowListTab | null>(null);

  const [presented, setPresented] = useState(false);
  /** Slide finished and the panel transform has been removed. */
  const [panelResting, setPanelResting] = useState(false);
  /** Globe mounts after the slide, so it is not created on the home screen. */
  const [drawerSettled, setDrawerSettled] = useState(false);
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
      setPanelResting(false);
      setDrawerSettled(false);
      slideX.setValue(-panelWidth);
      const open = Animated.timing(slideX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      open.start(({ finished }) => {
        if (finished) setPanelResting(true);
      });
      return () => open.stop();
    }

    if (!presented) return;
    setAccountSheetOpen(false);
    slideX.setValue(0);
    const timer = setTimeout(() => {
      Animated.timing(slideX, {
        toValue: -panelWidth,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setPresented(false);
          setPanelResting(false);
          setDrawerSettled(false);
        }
      });
    }, 32);
    return () => clearTimeout(timer);
  }, [panelWidth, presented, slideX, visible]);

  useEffect(() => {
    if (!panelResting) return;
    const timer = setTimeout(() => setDrawerSettled(true), 48);
    return () => clearTimeout(timer);
  }, [panelResting]);

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
              paddingBottom: 0,
              elevation: panelResting ? 0 : 8,
            },
            panelResting ? null : { transform: [{ translateX: slideX }] },
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
              <View style={styles.profileActions} pointerEvents="box-none">
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
                <Pressable
                  style={styles.editBtn}
                  onPressIn={() => {
                    void Haptics.selectionAsync();
                    prefetch("Settings");
                  }}
                  onPress={() => go("Settings")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="설정"
                >
                  <Ionicons name="settings-outline" size={16} color="#fff" />
                </Pressable>
              </View>
              <View style={styles.profileUpper}>
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
                    </View>
                  </Pressable>
                </View>
              </View>
              <View style={styles.stats}>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    if (user?.username) setFollowListTab("following");
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`팔로잉 ${user?.counts?.following ?? 0}명`}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{user?.counts?.following ?? 0}</Text> 팔로잉
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    if (user?.username) setFollowListTab("followers");
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={`팔로워 ${user?.counts?.followers ?? 0}명`}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{user?.counts?.followers ?? 0}</Text> 팔로워
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.menuBlock}>
              <Text style={styles.sectionTitle}>Explore</Text>
              {EXPLORE.map((item) =>
                "externalUrl" in item ? (
                  <DrawerRow
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    iconColor={item.accent ? FOLK_EXPLORE_ACCENT : rowIcon}
                    labelColor={item.accent ? FOLK_EXPLORE_ACCENT : rowLabel}
                    chevronColor={rowChevron}
                    rowHeight={layout.rowH}
                    onPress={() => {
                      setAccountSheetOpen(false);
                      onClose();
                      void Linking.openURL(item.externalUrl).catch(() => undefined);
                    }}
                  />
                ) : (
                  <DrawerRow
                    key={item.route}
                    label={item.label}
                    icon={item.icon}
                    iconColor={item.accent ? FOLK_EXPLORE_ACCENT : rowIcon}
                    labelColor={item.accent ? FOLK_EXPLORE_ACCENT : rowLabel}
                    chevronColor={rowChevron}
                    rowHeight={layout.rowH}
                    onPressIn={() => prefetch(item.route)}
                    onPress={() => go(item.route)}
                  />
                )
              )}
            </View>

            <DrawerSubcultureMapCard
              active={visible && !accountSheetOpen}
              showGlobe={drawerSettled && !accountSheetOpen}
              height={layout.mapH}
              onExpandPressIn={() => prefetch("EventsMap")}
              onExpand={() => go("EventsMap")}
            />
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
    {user?.username ? (
      <ProfileFollowListSheet
        visible={followListTab !== null}
        tab={followListTab ?? "followers"}
        username={user.username}
        onClose={() => setFollowListTab(null)}
      />
    ) : null}

    <AccountsBottomSheet
      visible={accountSheetOpen}
      onClose={closeAccountSheet}
      onCreateNew={() => {
        setAccountSheetOpen(false);
        onClose();
        onAddAccountLogin?.("signup");
      }}
      onAddExisting={() => {
        setAccountSheetOpen(false);
        onClose();
        onAddAccountLogin?.("signin");
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
    },
    panelBody: {
      flex: 1,
      minHeight: 0,
      justifyContent: "space-between",
    },
    menuBlock: {
      flexShrink: 0,
    },
    profileCard: {
      width: "100%",
      aspectRatio: 3,
      borderRadius: radii.lg,
      overflow: "hidden",
      backgroundColor: isDark ? "#141820" : colors.surfaceRaised,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: isDark ? "rgba(180, 210, 255, 0.28)" : colors.hairline,
      flexShrink: 0,
    },
    profileBannerOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    profileUpper: {
      flex: 1,
      position: "relative",
      justifyContent: "center",
      zIndex: 1,
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
    },
    profileTapArea: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minWidth: 0,
    },
    profileMeta: { flex: 1, minWidth: 0 },
    profileActions: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 2,
      width: 34,
      flexDirection: "column",
      alignItems: "center",
      gap: spacing.sm,
    },
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
    stats: {
      flexDirection: "row",
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      zIndex: 1,
    },
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
  });
}
