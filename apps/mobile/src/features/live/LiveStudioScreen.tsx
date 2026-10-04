import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ApiError } from "@/api/client";
import { API_BASE_URL } from "@/config/env";
import {
  assignStudioStaff,
  banStudioViewer,
  disconnectStudioAccount,
  fetchStudioAccounts,
  fetchStudioBans,
  fetchStudioObsChat,
  fetchStudioSettings,
  fetchStudioStaff,
  removeStudioStaff,
  saveStudioSettings,
  searchStudioUsers,
  startStudioConnect,
  unbanStudioViewer,
  type StudioAccount,
  type StudioBan,
  type StudioCategory,
  type StudioRole,
  type StudioSearchHit,
  type StudioStaff,
} from "@/api/live-studio";
import { liveCategoryLabel } from "@/features/live/live-categories";
import { TwitchMark, YoutubeMark } from "@/features/live/StreamingBrandMark";
import { useI18n } from "@/i18n/I18nProvider";
import type { TFn } from "@/i18n/types";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { Screen } from "@/ui/Screen";

const CATEGORIES: StudioCategory[] = ["JUST_CHATTING", "GAME", "MUSIC", "IRL", "LIVE"];
const WEEKDAYS: { d: number; key: string }[] = [
  { d: 1, key: "m.live.studio.mon" },
  { d: 2, key: "m.live.studio.tue" },
  { d: 3, key: "m.live.studio.wed" },
  { d: 4, key: "m.live.studio.thu" },
  { d: 5, key: "m.live.studio.fri" },
  { d: 6, key: "m.live.studio.sat" },
  { d: 0, key: "m.live.studio.sun" },
];
const PLATFORMS = ["YOUTUBE", "TWITCH"] as const;

function roleLabel(t: TFn, role: StudioRole) {
  switch (role) {
    case "OWNER":
      return t("m.live.studio.role_owner");
    case "MANAGER":
      return t("m.live.studio.role_manager");
    case "MODERATOR":
      return t("m.live.studio.role_moderator");
    case "VIP":
      return t("m.live.studio.role_vip");
    default:
      return t("m.live.studio.role_viewer");
  }
}

function errorMessage(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

function absoluteChatUrl(path: string) {
  if (path.startsWith("http")) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function LiveStudioScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  const [category, setCategory] = useState<StudioCategory>("JUST_CHATTING");
  const [announcement, setAnnouncement] = useState("");
  const [bio, setBio] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [scheduleWeekdays, setScheduleWeekdays] = useState<number[]>([]);
  const [scheduleTime, setScheduleTime] = useState("");
  const [settingsMsg, setSettingsMsg] = useState("");
  const [staffQuery, setStaffQuery] = useState("");
  const [banQuery, setBanQuery] = useState("");
  const [staffHits, setStaffHits] = useState<StudioSearchHit[]>([]);
  const [banHits, setBanHits] = useState<StudioSearchHit[]>([]);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [obsCopied, setObsCopied] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["mobile-live-studio"],
    queryFn: fetchStudioSettings,
  });
  const accountsQuery = useQuery({
    queryKey: ["mobile-live-studio-accounts"],
    queryFn: fetchStudioAccounts,
  });
  const staffQueryResult = useQuery({
    queryKey: ["mobile-live-studio-staff"],
    queryFn: fetchStudioStaff,
  });
  const bansQuery = useQuery({
    queryKey: ["mobile-live-studio-bans"],
    queryFn: fetchStudioBans,
  });
  const obsQuery = useQuery({
    queryKey: ["mobile-live-studio-obs"],
    queryFn: fetchStudioObsChat,
    retry: false,
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (!settings || hydrated.current) return;
    hydrated.current = true;
    const next =
      settings.defaultCategory === "VIRTUAL" ? "JUST_CHATTING" : settings.defaultCategory;
    if (CATEGORIES.includes(next as StudioCategory)) setCategory(next as StudioCategory);
    setAnnouncement(settings.announcement);
    setBio(settings.bio);
    setScheduleNote(settings.scheduleNote);
    setScheduleWeekdays(settings.scheduleWeekdays ?? []);
    setScheduleTime(settings.scheduleTime ?? "");
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: () =>
      saveStudioSettings({
        defaultCategory: category,
        announcement,
        bio,
        scheduleNote,
        scheduleWeekdays,
        scheduleTime,
      }),
    onSuccess: () => setSettingsMsg(t("m.live.studio.saved")),
    onError: (e) => setSettingsMsg(errorMessage(e, t("m.live.studio.could_not_save"))),
  });

  function toggleWeekday(day: number) {
    setScheduleWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  }

  async function connectPlatform(platform: "YOUTUBE" | "TWITCH") {
    setActionError("");
    setBusy(true);
    try {
      const { url } = await startStudioConnect(platform);
      await WebBrowser.openBrowserAsync(url);
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-accounts"] });
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_connect")));
    } finally {
      setBusy(false);
    }
  }

  function confirmDisconnect(account: StudioAccount) {
    Alert.alert(t("m.live.studio.disconnect"), t("m.live.studio.remove_confirm"), [
      { text: t("m.common.cancel"), style: "cancel" },
      {
        text: t("m.live.studio.disconnect"),
        style: "destructive",
        onPress: () => {
          void (async () => {
            setBusy(true);
            setActionError("");
            try {
              await disconnectStudioAccount(account.id);
              await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-accounts"] });
              await queryClient.invalidateQueries({ queryKey: ["mobile-live-accounts"] });
            } catch (e) {
              setActionError(errorMessage(e, t("m.live.studio.could_not_remove")));
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function runSearch(kind: "staff" | "ban") {
    setActionError("");
    const q = kind === "staff" ? staffQuery : banQuery;
    try {
      const { users } = await searchStudioUsers(q);
      if (kind === "staff") setStaffHits(users);
      else setBanHits(users);
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_search")));
    }
  }

  async function onAssign(userId: string) {
    setBusy(true);
    setActionError("");
    setActionMsg("");
    try {
      await assignStudioStaff(userId);
      setActionMsg(t("m.live.studio.staff_assigned"));
      setStaffHits([]);
      setStaffQuery("");
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-staff"] });
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_assign")));
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveStaff(userId: string) {
    setBusy(true);
    setActionError("");
    try {
      await removeStudioStaff(userId);
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-staff"] });
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_assign")));
    } finally {
      setBusy(false);
    }
  }

  async function onBan(userId: string) {
    setBusy(true);
    setActionError("");
    setActionMsg("");
    try {
      await banStudioViewer(userId);
      setActionMsg(t("m.live.studio.viewer_banned"));
      setBanHits([]);
      setBanQuery("");
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-bans"] });
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_block")));
    } finally {
      setBusy(false);
    }
  }

  async function onUnban(userId: string) {
    setBusy(true);
    setActionError("");
    try {
      await unbanStudioViewer(userId);
      await queryClient.invalidateQueries({ queryKey: ["mobile-live-studio-bans"] });
    } catch (e) {
      setActionError(errorMessage(e, t("m.live.studio.could_not_block")));
    } finally {
      setBusy(false);
    }
  }

  const obsUrl = obsQuery.data?.chatUrl ? absoluteChatUrl(obsQuery.data.chatUrl) : null;
  const accounts = accountsQuery.data?.accounts ?? [];
  const loading = settingsQuery.isLoading && !settingsQuery.data;

  return (
    <Screen>
      <AppHeader
        title={t("m.live.studio.title")}
        onLeftPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>{t("m.live.studio.tag")}</Text>
        <Text style={styles.lead}>{t("m.live.studio.desc")}</Text>
        <Pressable onPress={() => navigation.navigate("LiveList")}>
          <Text style={styles.link}>{t("m.live.studio.back_to_live")}</Text>
        </Pressable>

        <Pressable style={styles.primaryBtn} onPress={() => navigation.navigate("LiveGoLive")}>
          <Ionicons name="videocam" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>{t("m.live.studio.go_live")}</Text>
        </Pressable>

        {loading ? (
          <ActivityIndicator color={colors.terracotta} style={{ marginTop: 28 }} />
        ) : settingsQuery.isError ? (
          <View style={styles.card}>
            <Text style={styles.error}>{t("m.live.studio.could_not_load")}</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => void settingsQuery.refetch()}>
              <Text style={styles.secondaryBtnText}>{t("m.common.try_again")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{t("m.live.studio.channels_title")}</Text>
                <View style={styles.logoRow}>
                  <YoutubeMark height={22} />
                  <TwitchMark height={22} />
                </View>
              </View>
              <Text style={styles.hint}>{t("m.live.studio.channels_desc")}</Text>
              {accountsQuery.isError ? (
                <Text style={styles.error}>{t("m.live.studio.could_not_load")}</Text>
              ) : null}
              {PLATFORMS.map((platform) => {
                const account = accounts.find((row) => row.platform === platform);
                const label =
                  platform === "YOUTUBE" ? t("m.live.studio.youtube") : t("m.live.studio.twitch");
                return (
                  <View key={platform} style={styles.channelRow}>
                    <View style={styles.logoSlot}>
                      {platform === "YOUTUBE" ? <YoutubeMark height={26} /> : <TwitchMark height={26} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.channelName}>{label}</Text>
                      <Text style={styles.channelMeta} numberOfLines={1}>
                        {account
                          ? t("m.live.studio.linked", { name: account.channelName })
                          : t("m.live.studio.not_connected")}
                      </Text>
                      {account?.verified ? (
                        <Text style={styles.verified}>{t("m.live.studio.verified")}</Text>
                      ) : account?.pendingVerification ? (
                        <Text style={styles.pending}>{t("m.live.studio.pending")}</Text>
                      ) : account ? (
                        <Text style={styles.channelMeta}>{t("m.live.studio.not_verified")}</Text>
                      ) : null}
                    </View>
                    {account ? (
                      <View style={styles.channelActions}>
                        <Pressable
                          hitSlop={8}
                          onPress={() => void Linking.openURL(account.channelUrl).catch(() => undefined)}
                        >
                          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
                        </Pressable>
                        <Pressable
                          style={styles.ghostBtn}
                          disabled={busy}
                          onPress={() => confirmDisconnect(account)}
                        >
                          <Text style={styles.ghostBtnText}>{t("m.live.studio.disconnect")}</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <Pressable
                        style={styles.smallPrimary}
                        disabled={busy}
                        onPress={() => void connectPlatform(platform)}
                      >
                        <Text style={styles.smallPrimaryText}>{t("m.live.studio.connect")}</Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("m.live.studio.obs_title")}</Text>
              <Text style={styles.hint}>{t("m.live.studio.obs_desc")}</Text>
              {obsQuery.isLoading ? (
                <Text style={styles.hint}>{t("m.live.studio.obs_loading")}</Text>
              ) : obsQuery.data?.empty || !obsUrl ? (
                <Text style={styles.hint}>{t("m.live.studio.obs_none")}</Text>
              ) : (
                <>
                  <Pressable
                    style={styles.secondaryBtn}
                    onPress={() => {
                      void Share.share({ message: obsUrl }).then(() => {
                        setObsCopied(true);
                        setTimeout(() => setObsCopied(false), 2000);
                      });
                    }}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {obsCopied ? t("m.live.studio.obs_copied") : t("m.live.studio.obs_copy")}
                    </Text>
                  </Pressable>
                  <Text selectable style={styles.mono}>
                    {obsUrl}
                  </Text>
                </>
              )}
            </View>

            {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
            {actionMsg ? <Text style={styles.ok}>{actionMsg}</Text> : null}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("m.live.studio.basic_settings")}</Text>
              <Text style={styles.hint}>{t("m.live.studio.basic_settings_desc")}</Text>
              <Text style={styles.label}>{t("m.live.studio.category")}</Text>
              <View style={styles.wrap}>
                {CATEGORIES.map((id) => {
                  const active = category === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setCategory(id)}
                      style={[
                        styles.pill,
                        active
                          ? { backgroundColor: "rgba(197, 82, 42, 0.15)", borderColor: colors.terracotta }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={{ color: active ? colors.terracotta : colors.textMuted, fontWeight: "700", fontSize: 12 }}>
                        {liveCategoryLabel(id)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t("m.live.studio.pinned")}</Text>
              <TextInput
                style={[styles.input, styles.area]}
                value={announcement}
                onChangeText={setAnnouncement}
                placeholder={t("m.live.studio.pinned_ph")}
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
              />
              <Text style={styles.label}>{t("m.live.studio.bio")}</Text>
              <TextInput
                style={[styles.input, styles.area]}
                value={bio}
                onChangeText={setBio}
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
              />
              <Text style={styles.label}>{t("m.live.studio.weekly_days")}</Text>
              <View style={styles.wrap}>
                {WEEKDAYS.map((day) => {
                  const on = scheduleWeekdays.includes(day.d);
                  return (
                    <Pressable
                      key={day.d}
                      onPress={() => toggleWeekday(day.d)}
                      style={[
                        styles.day,
                        on
                          ? { backgroundColor: "rgba(5, 150, 105, 0.18)", borderColor: "#059669" }
                          : { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Text style={{ color: on ? colors.success : colors.textMuted, fontWeight: "800", fontSize: 12 }}>
                        {t(day.key)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.label}>{t("m.live.studio.start_time")}</Text>
              <TextInput
                style={[styles.input, { maxWidth: 120 }]}
                value={scheduleTime}
                onChangeText={setScheduleTime}
                placeholder="21:00"
                placeholderTextColor={colors.textMuted}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
              />
              <Text style={styles.label}>{t("m.live.studio.schedule_memo")}</Text>
              <TextInput
                style={[styles.input, styles.area]}
                value={scheduleNote}
                onChangeText={setScheduleNote}
                placeholder={t("m.live.studio.schedule_memo_ph")}
                placeholderTextColor={colors.textMuted}
                maxLength={300}
                multiline
              />
              <Text style={styles.hint}>{t("m.live.studio.schedule_memo_hint")}</Text>
              <Pressable
                style={[styles.primaryBtn, save.isPending && styles.disabled]}
                disabled={save.isPending}
                onPress={() => {
                  setSettingsMsg("");
                  save.mutate();
                }}
              >
                {save.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("m.live.studio.save")}</Text>
                )}
              </Pressable>
              {settingsMsg ? <Text style={styles.hint}>{settingsMsg}</Text> : null}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("m.live.studio.staff_title")}</Text>
              <Text style={styles.hint}>{t("m.live.studio.staff_desc")}</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={staffQuery}
                  onChangeText={setStaffQuery}
                  placeholder={t("m.live.studio.staff_search")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={() => void runSearch("staff")}
                />
                <Pressable style={styles.iconBtn} onPress={() => void runSearch("staff")}>
                  <Ionicons name="search" size={18} color={colors.brand} />
                </Pressable>
              </View>
              {staffHits.map((hit) => (
                <PersonRow
                  key={hit.id}
                  image={hit.image}
                  username={hit.username}
                  meta={roleLabel(t, hit.currentRole)}
                  styles={styles}
                  actionLabel={t("m.live.studio.assign")}
                  disabled={busy || hit.currentRole === "OWNER"}
                  onAction={() => void onAssign(hit.id)}
                  colors={colors}
                />
              ))}
              {staffQueryResult.isLoading ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                (staffQueryResult.data?.staff ?? []).map((member) => (
                  <StaffRow
                    key={member.userId}
                    member={member}
                    styles={styles}
                    colors={colors}
                    role={roleLabel(t, member.role)}
                    busy={busy}
                    removeLabel={t("m.live.studio.remove_role")}
                    onRemove={() => void onRemoveStaff(member.userId)}
                  />
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("m.live.studio.bans_title")}</Text>
              <Text style={styles.hint}>{t("m.live.studio.bans_desc")}</Text>
              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={banQuery}
                  onChangeText={setBanQuery}
                  placeholder={t("m.live.studio.ban_search")}
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  onSubmitEditing={() => void runSearch("ban")}
                />
                <Pressable style={styles.iconBtn} onPress={() => void runSearch("ban")}>
                  <Ionicons name="search" size={18} color={colors.brand} />
                </Pressable>
              </View>
              {banHits.map((hit) => (
                <PersonRow
                  key={hit.id}
                  image={hit.image}
                  username={hit.username}
                  meta={
                    hit.isBanned
                      ? t("m.live.studio.already_banned")
                      : roleLabel(t, hit.currentRole)
                  }
                  styles={styles}
                  actionLabel={t("m.live.studio.ban")}
                  danger
                  disabled={busy || hit.currentRole === "OWNER" || hit.isBanned}
                  onAction={() => void onBan(hit.id)}
                  colors={colors}
                />
              ))}
              {bansQuery.isLoading ? (
                <ActivityIndicator color={colors.brand} />
              ) : (bansQuery.data?.bans ?? []).length === 0 ? (
                <Text style={styles.hint}>{t("m.live.studio.no_bans")}</Text>
              ) : (
                (bansQuery.data?.bans ?? []).map((ban) => (
                  <BanRow
                    key={ban.userId}
                    ban={ban}
                    styles={styles}
                    label={t("m.live.studio.unban")}
                    disabled={busy}
                    onUnban={() => void onUnban(ban.userId)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function PersonRow({
  image,
  username,
  meta,
  actionLabel,
  onAction,
  disabled,
  danger,
  styles,
  colors,
}: {
  image: string | null;
  username: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  danger?: boolean;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.person}>
      <FolkAvatar uri={image} name={username} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.channelName} numberOfLines={1}>
          @{username}
        </Text>
        <Text style={styles.channelMeta}>{meta}</Text>
      </View>
      <Pressable
        style={[styles.smallPrimary, danger && { backgroundColor: colors.danger }, disabled && styles.disabled]}
        disabled={disabled}
        onPress={onAction}
      >
        <Text style={styles.smallPrimaryText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function StaffRow({
  member,
  role,
  busy,
  removeLabel,
  onRemove,
  styles,
  colors,
}: {
  member: StudioStaff;
  role: string;
  busy: boolean;
  removeLabel: string;
  onRemove: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.person}>
      <FolkAvatar uri={member.image} name={member.username} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.channelName} numberOfLines={1}>
          @{member.username}
        </Text>
        <Text style={styles.channelMeta}>{role}</Text>
      </View>
      {member.role !== "OWNER" ? (
        <Pressable
          accessibilityLabel={removeLabel}
          disabled={busy}
          onPress={onRemove}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function BanRow({
  ban,
  label,
  disabled,
  onUnban,
  styles,
}: {
  ban: StudioBan;
  label: string;
  disabled: boolean;
  onUnban: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const when = new Date(ban.at).toLocaleDateString();
  return (
    <View style={styles.person}>
      <FolkAvatar uri={ban.image} name={ban.username} size={32} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.channelName} numberOfLines={1}>
          @{ban.username}
        </Text>
        <Text style={styles.channelMeta} numberOfLines={2}>
          @{ban.bannedBy} · {when}
          {ban.reason ? ` · ${ban.reason}` : ""}
        </Text>
      </View>
      <Pressable style={[styles.ghostBtn, disabled && styles.disabled]} disabled={disabled} onPress={onUnban}>
        <Text style={styles.ghostBtnText}>{label}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, paddingBottom: 48, gap: 12 },
    kicker: {
      color: colors.terracotta,
      fontWeight: "800",
      fontSize: 11,
      letterSpacing: 0.4,
    },
    lead: { color: colors.textMuted, fontWeight: "600", lineHeight: 20, fontSize: 13 },
    link: { color: colors.brand, fontWeight: "700", fontSize: 13 },
    card: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceRaised,
      padding: 14,
      gap: 8,
    },
    cardTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    cardTitle: { color: colors.brand, fontWeight: "800", fontSize: 16, flexShrink: 1 },
    logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    hint: { color: colors.textMuted, fontSize: 12, fontWeight: "600", lineHeight: 18 },
    label: { color: colors.text, fontWeight: "800", fontSize: 13, marginTop: 6 },
    input: {
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      color: colors.text,
      fontWeight: "600",
      fontSize: 14,
    },
    area: { minHeight: 72, textAlignVertical: "top" },
    wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    pill: { borderWidth: 1.5, borderRadius: radii.md, paddingHorizontal: 12, paddingVertical: 7 },
    day: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    channelRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    logoSlot: { width: 40, alignItems: "center" },
    channelName: { color: colors.text, fontWeight: "800", fontSize: 14 },
    channelMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "600", marginTop: 2 },
    verified: { color: colors.success, fontWeight: "800", fontSize: 12, marginTop: 2 },
    pending: { color: colors.terracotta, fontWeight: "800", fontSize: 12, marginTop: 2 },
    channelActions: { alignItems: "flex-end", gap: 8 },
    person: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      padding: 8,
    },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconBtn: {
      width: 42,
      height: 42,
      borderRadius: radii.md,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      minHeight: 44,
      paddingHorizontal: 14,
    },
    primaryBtnText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    secondaryBtn: {
      alignSelf: "flex-start",
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    secondaryBtnText: { color: colors.brand, fontWeight: "800", fontSize: 13 },
    smallPrimary: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    smallPrimaryText: { color: "#fff", fontWeight: "800", fontSize: 12 },
    ghostBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    ghostBtnText: { color: colors.text, fontWeight: "700", fontSize: 12 },
    error: { color: colors.danger, fontWeight: "700", fontSize: 13 },
    ok: { color: colors.brand, fontWeight: "700", fontSize: 13 },
    mono: { color: colors.textMuted, fontSize: 11, fontWeight: "600" },
    disabled: { opacity: 0.55 },
  });
}
