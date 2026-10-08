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
import type { FollowListTab } from "@/api/social";
import { AccountsBottomSheet } from "@/features/account/AccountMenuSheet";
import { ProfileFollowListSheet } from "@/features/profile/ProfileFollowListSheet";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { ProfileBannerMedia } from "@/features/profile/ProfileBannerMedia";
import { DrawerSubcultureMapCard } from "@/navigation/DrawerSubcultureMapCard";
import { prefetchDrawerRoute, warmDrawerBundles } from "@/navigation/tab-warmup";
import type { DrawerRoute } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { FOLK_EXPLORE_ACCENT, radii, spacing, type ThemeColors } from "@/theme/tokens";

export type { DrawerRoute } from "@/navigation/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (route: DrawerRoute) => void;
  onAddAccountLogin?: (intent: "signin" | "signup") => void;
};

type ExploreItem = {
  route: DrawerRoute;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: boolean;
};

const EXPLORE: ExploreItem[] = [
  { route: "Used", labelKey: "nav.market", icon: "cart-outline", accent: true },
  { route: "LiveList", labelKey: "nav.live", icon: "radio-outline", accent: true },
  { route: "StarList", labelKey: "nav.star", icon: "star-outline" },
  { route: "CommunityList", labelKey: "nav.communities", icon: "people-outline" },
  { route: "AnimeList", labelKey: "nav.anime", icon: "book-outline" },
  { route: "Wallet", labelKey: "nav.wallet", icon: "wallet-outline" },
  { route: "LiveStudio", labelKey: "nav.studio", icon: "tv-outline", accent: true },
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
  const { t } = useI18n();
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
  /** Globe mounts after the slide, so it is not created on the home screen. */
  const [drawerSettled, setDrawerSettled] = useState(false);
  const slideX = useRef(new Animated.Value(-360)).current;
  const presentedRef = useRef(false);
  const visibleRef = useRef(visible);
  const panelWidthRef = useRef(panelWidth);
  visibleRef.current = visible;
  panelWidthRef.current = panelWidth;

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

  const hideDrawerChrome = () => {
    if (visibleRef.current) return;
    presentedRef.current = false;
    setPresented(false);
    setDrawerSettled(false);
    setAccountSheetOpen(false);
    setFollowListTab(null);
  };

  useEffect(() => {
    if (visible) {
      warmDrawerBundles();
    } else {
      setAccountSheetOpen(false);
      setFollowListTab(null);
      setDrawerSettled(false);
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
    let anim: Animated.CompositeAnimation | null = null;
    let failsafe: ReturnType<typeof setTimeout> | null = null;

    if (visible) {
      presentedRef.current = true;
      setPresented(true);
      setDrawerSettled(false);
      slideX.setValue(-panelWidthRef.current);
      anim = Animated.timing(slideX, {
        toValue: 0,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      });
      anim.start(({ finished }) => {
        if (finished && visibleRef.current) {
          setDrawerSettled(true);
        }
      });
      return () => {
        anim?.stop();
      };
    }

    if (!presentedRef.current) return;

    // Drop native globe/video immediately so iOS cannot leave a ghost hit layer.
    setDrawerSettled(false);
    setAccountSheetOpen(false);
    setFollowListTab(null);

    anim = Animated.timing(slideX, {
      toValue: -panelWidthRef.current,
      duration: CLOSE_MS,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start(() => {
      hideDrawerChrome();
    });
    failsafe = setTimeout(hideDrawerChrome, CLOSE_MS + 80);

    return () => {
      anim?.stop();
      if (failsafe) clearTimeout(failsafe);
    };
    // `presented` must stay out of deps — toggling it used to cancel the close
    // animation and leave a transparent Modal eating every tap on iOS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideX, visible]);

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

  if (!presented) return null;

  return (
    <>
    <Modal
      visible
      animationType="none"
      transparent
      onRequestClose={handleDrawerClose}
      statusBarTranslucent
    >
      <View
        style={styles.root}
        collapsable={false}
        pointerEvents={visible ? "auto" : "none"}
      >
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
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            style={[
              StyleSheet.absoluteFill,
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
                style={{ pointerEvents: "none" }}
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
                  accessibilityLabel={t("settings.editProfile")}
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
                  accessibilityLabel={t("nav.settings")}
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
                    accessibilityLabel={t("m.nav.switch_account")}
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
              <View style={styles.stats} pointerEvents="box-none">
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setAccountSheetOpen(false);
                    if (user?.username) setFollowListTab("following");
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={t("m.nav.following_v", { v: String(user?.counts?.following ?? 0) })}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{user?.counts?.following ?? 0}</Text>{" "}
                    {t("m.common.following")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setAccountSheetOpen(false);
                    if (user?.username) setFollowListTab("followers");
                  }}
                  hitSlop={4}
                  accessibilityRole="button"
                  accessibilityLabel={t("m.nav.followers_v", { v: String(user?.counts?.followers ?? 0) })}
                >
                  <Text style={styles.stat}>
                    <Text style={styles.statNum}>{user?.counts?.followers ?? 0}</Text>{" "}
                    {t("m.common.followers")}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.menuBlock}>
              <Text style={styles.sectionTitle}>{t("nav.explore")}</Text>
              {EXPLORE.map((item) => (
                <DrawerRow
                  key={item.route}
                  label={t(item.labelKey)}
                  icon={item.icon}
                  iconColor={item.accent ? FOLK_EXPLORE_ACCENT : rowIcon}
                  labelColor={item.accent ? FOLK_EXPLORE_ACCENT : rowLabel}
                  chevronColor={rowChevron}
                  rowHeight={layout.rowH}
                  onPressIn={() => prefetch(item.route)}
                  onPress={() => go(item.route)}
                />
              ))}
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
          accessibilityLabel={t("m.nav.close_menu")}
        />
        {user?.username ? (
          <ProfileFollowListSheet
            embedInParent
            visible={followListTab !== null}
            tab={followListTab ?? "followers"}
            username={user.username}
            onClose={() => setFollowListTab(null)}
          />
        ) : null}
      </View>
    </Modal>

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
      onUnregisteredAccount={() => {
        setAccountSheetOpen(false);
        onClose();
        onAddAccountLogin?.("signup");
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
      ...StyleSheet.absoluteFill,
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
      ...StyleSheet.absoluteFill,
      backgroundColor: "rgba(0,0,0,0.38)",
    },
    profileUpper: {
      flex: 1,
      position: "relative",
      justifyContent: "center",
      zIndex: 1,
      pointerEvents: "box-none",
    },
    profileRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: spacing.md,
    },
    profileTapArea: {
      flexShrink: 1,
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
      zIndex: 4,
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
