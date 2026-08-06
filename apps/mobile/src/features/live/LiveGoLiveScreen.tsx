import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  createExternalLive,
  fetchStreamingAccounts,
  type StreamingAccount,
} from "@/api/live";
import { ApiError } from "@/api/client";
import {
  MOBILE_LIVE_CATEGORIES,
  providerLabel,
  type MobileLiveCategoryId,
} from "@/features/live/live-categories";
import { AppHeader } from "@/ui/AppHeader";
import { FolkAvatar } from "@/ui/FolkAvatar";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, shadows, spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

const PLATFORM_CATS = MOBILE_LIVE_CATEGORIES.filter((c) => c.id !== "ALL");

export function LiveGoLiveScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState<string | null>(null);
  const [category, setCategory] = useState<Exclude<MobileLiveCategoryId, "ALL">>("JUST_CHATTING");
  const [formError, setFormError] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["mobile-live-accounts"],
    queryFn: fetchStreamingAccounts,
    staleTime: 60_000,
  });

  const accounts = accountsQuery.data?.accounts ?? [];
  const selected = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const activeAccountId = accountId ?? selected?.id ?? null;

  const create = useMutation({
    mutationFn: () =>
      createExternalLive({
        name: name.trim(),
        connectedAccountId: activeAccountId!,
        category,
        goLive: true,
      }),
    onSuccess: (res) => {
      navigation.replace("LiveDetail", { id: res.channel.id });
    },
    onError: (e) => {
      const msg =
        e instanceof ApiError &&
        e.body &&
        typeof e.body === "object" &&
        "error" in e.body
          ? String((e.body as { error: string }).error)
          : e instanceof Error
            ? e.message
            : "방송을 시작하지 못했습니다.";
      setFormError(msg);
    },
  });

  return (
    <Screen>
      <AppHeader title="라이브 방송 시작" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>
          영상은 YouTube · Twitch · 치지직 플레이어로만 표시됩니다. 채팅은 MoCoMo에서 제공합니다.
        </Text>

        {accountsQuery.isLoading ? (
          <ActivityIndicator color={colors.terracotta} style={{ marginTop: 24 }} />
        ) : accountsQuery.isError ? (
          <Text style={styles.error}>계정 목록을 불러오지 못했습니다.</Text>
        ) : accounts.length === 0 ? (
          <View style={styles.gate}>
            <Ionicons name="link-outline" size={28} color={colors.terracotta} />
            <Text style={styles.gateTitle}>인증된 스트리밍 계정이 필요합니다</Text>
            <Text style={styles.gateCopy}>
              웹 설정에서 YouTube · Twitch · 치지직 계정을 연결·인증한 뒤 앱에서 방송을 시작할 수
              있습니다.
            </Text>
            <Pressable
              style={styles.primaryBtn}
              onPress={() =>
                void Linking.openURL("https://mocomo.net/settings/streaming-accounts").catch(
                  () => undefined
                )
              }
            >
              <Ionicons name="open-outline" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>웹에서 계정 연결</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("LiveList")}>
              <Text style={styles.secondaryBtnText}>진행 중 방송 보기</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>방송 제목</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={selected ? `${selected.channelName} 라이브` : "오늘의 라이브"}
              placeholderTextColor={colors.textMuted}
              maxLength={120}
            />

            <Text style={[styles.label, { marginTop: spacing.md }]}>스트리밍 계정</Text>
            {accounts.map((acc) => (
              <AccountRow
                key={acc.id}
                account={acc}
                active={acc.id === activeAccountId}
                onPress={() => setAccountId(acc.id)}
                styles={styles}
                colors={colors}
              />
            ))}

            <Text style={[styles.label, { marginTop: spacing.md }]}>카테고리</Text>
            <View style={styles.catRow}>
              {PLATFORM_CATS.map((c) => {
                const active = category === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setCategory(c.id)}
                    style={[
                      styles.catPill,
                      active
                        ? { backgroundColor: colors.terracotta, borderColor: colors.terracotta }
                        : { backgroundColor: colors.muted, borderColor: colors.border },
                    ]}
                  >
                    <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "700", fontSize: 12 }}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {formError ? <Text style={styles.error}>{formError}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, (!activeAccountId || create.isPending) && styles.disabled]}
              disabled={!activeAccountId || create.isPending}
              onPress={() => {
                setFormError(null);
                create.mutate();
              }}
            >
              {create.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="radio" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>방송 시작</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.secondaryBtn} onPress={() => navigation.navigate("LiveList")}>
              <Text style={styles.secondaryBtnText}>진행 중 방송 보기</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function AccountRow({
  account,
  active,
  onPress,
  styles,
  colors,
}: {
  account: StreamingAccount;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.account,
        active
          ? { borderColor: colors.terracotta, backgroundColor: "rgba(197, 82, 42, 0.08)" }
          : { borderColor: colors.border, backgroundColor: colors.surfaceRaised },
      ]}
    >
      <FolkAvatar uri={account.profileImage} name={account.channelName} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.accountTitleRow}>
          <Text style={styles.accountName} numberOfLines={1}>
            {account.channelName}
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{providerLabel(account.platform)}</Text>
          </View>
        </View>
        <Text style={styles.accountId} numberOfLines={1}>
          {account.channelId}
        </Text>
      </View>
      <Pressable
        onPress={() => void Linking.openURL(account.channelUrl).catch(() => undefined)}
        hitSlop={8}
      >
        <Ionicons name="open-outline" size={18} color={colors.textMuted} />
      </Pressable>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, paddingBottom: 48 },
    lead: {
      color: colors.textMuted,
      fontWeight: "600",
      lineHeight: 20,
      marginBottom: spacing.md,
      fontSize: 13,
    },
    form: { gap: 8 },
    label: { fontWeight: "800", color: colors.text, fontSize: 13, marginBottom: 4 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
      fontSize: 15,
    },
    account: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 2,
      marginBottom: 8,
    },
    accountTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    accountName: { fontWeight: "800", color: colors.text, fontSize: 14, flexShrink: 1 },
    accountId: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 2 },
    badge: {
      backgroundColor: colors.muted,
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    badgeText: { fontSize: 10, fontWeight: "700", color: colors.textMuted },
    catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
    catPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    gate: {
      padding: spacing.lg,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.2)",
      alignItems: "center",
      gap: 10,
      ...shadows.folkSm,
    },
    gateTitle: { fontSize: 17, fontWeight: "900", color: colors.cobalt, textAlign: "center" },
    gateCopy: {
      color: colors.textMuted,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 20,
      fontSize: 13,
    },
    primaryBtn: {
      marginTop: spacing.sm,
      backgroundColor: colors.terracotta,
      borderRadius: radii.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      ...shadows.folkSm,
    },
    primaryBtnText: { color: "#fff", fontWeight: "800" },
    secondaryBtn: {
      marginTop: 8,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: colors.muted,
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.18)",
    },
    secondaryBtnText: { color: colors.cobalt, fontWeight: "800" },
    disabled: { opacity: 0.5 },
    error: { color: colors.danger, fontWeight: "600", marginTop: 8 },
  });
}
