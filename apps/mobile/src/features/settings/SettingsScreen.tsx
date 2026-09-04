import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/auth/AuthContext";
import { patchMe } from "@/api/discovery";
import { fetchCheckoutMeta } from "@/api/checkout";
import { ApiError } from "@/api/client";
import { PayButton } from "@/payments/PayButton";
import { CreatorCallSettingsCard } from "@/features/settings/CreatorCallSettingsCard";
import { MessageComposerSettingsCard } from "@/features/settings/MessageComposerSettingsCard";
import { AccountDeletionCard } from "@/features/settings/AccountDeletionCard";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

const LOCALES = [
  { id: "ko", label: "한국어" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "zh", label: "中文" },
] as const;

const COUNTRIES = [
  { id: "KR", label: "대한민국" },
  { id: "US", label: "United States" },
  { id: "JP", label: "日本" },
  { id: "CN", label: "中国" },
  { id: "TW", label: "台灣" },
] as const;

const TIMEZONES = [
  "Asia/Seoul",
  "Asia/Tokyo",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "UTC",
] as const;

const LEGAL_LINKS = [
  { label: "이용약관", path: "/legal/terms" },
  { label: "크리에이터 약관", path: "/legal/creator-terms" },
  { label: "결제 정책", path: "/legal/payment" },
  { label: "저작권", path: "/legal/copyright" },
  { label: "개인정보 처리방침", path: "/legal/privacy" },
  { label: "계정 삭제 안내", path: "/legal/account-deletion" },
  { label: "커뮤니티 정책", path: "/legal/policy" },
] as const;

export function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user, refreshMe, signOut } = useAuth();

  const [locale, setLocale] = useState(user?.locale ?? "ko");
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "KR");
  const [timeZone, setTimeZone] = useState(user?.timeZone ?? "Asia/Seoul");
  const [localeBusy, setLocaleBusy] = useState(false);

  const checkoutMeta = useQuery({
    queryKey: ["mobile-checkout-meta"],
    queryFn: () => fetchCheckoutMeta(),
  });

  useEffect(() => {
    setLocale(user?.locale ?? "ko");
    setCountryCode(user?.countryCode ?? "KR");
    setTimeZone(user?.timeZone ?? "Asia/Seoul");
  }, [user?.locale, user?.countryCode, user?.timeZone]);

  async function saveLocale() {
    setLocaleBusy(true);
    try {
      await patchMe({ locale, countryCode, timeZone });
      await refreshMe();
      Alert.alert("저장됨", "지역·언어 설정이 업데이트되었습니다.");
    } catch (e) {
      Alert.alert("오류", errorMessage(e));
    } finally {
      setLocaleBusy(false);
    }
  }

  function openLegal(path: string) {
    void Linking.openURL(`https://mocomo.net${path}`);
  }

  return (
    <Screen>
      <AppHeader title="설정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <FolkCard>
            <Text style={styles.cardTitle}>언어 · 지역</Text>
            <Text style={styles.cardDesc}>표시 언어, 국가, 시간대를 설정합니다.</Text>

            <Text style={styles.label}>언어</Text>
            <View style={styles.chipRow}>
              {LOCALES.map((l) => (
                <Chip
                  key={l.id}
                  label={l.label}
                  active={locale === l.id}
                  onPress={() => setLocale(l.id)}
                  colors={colors}
                />
              ))}
            </View>

            <Text style={styles.label}>국가</Text>
            <View style={styles.chipRow}>
              {COUNTRIES.map((c) => (
                <Chip
                  key={c.id}
                  label={c.label}
                  active={countryCode === c.id}
                  onPress={() => setCountryCode(c.id)}
                  colors={colors}
                />
              ))}
            </View>

            <Text style={styles.label}>시간대</Text>
            <View style={styles.chipRow}>
              {TIMEZONES.map((tz) => (
                <Chip
                  key={tz}
                  label={tz}
                  active={timeZone === tz}
                  onPress={() => setTimeZone(tz)}
                  colors={colors}
                />
              ))}
            </View>

            <FolkButton
              label="지역 설정 저장"
              loading={localeBusy}
              onPress={() => void saveLocale()}
            />
          </FolkCard>

          {checkoutMeta.data?.configured ? (
            <FolkCard>
              <Text style={styles.cardTitle}>MoCoMo Premium</Text>
              <Text style={styles.cardDesc}>
                프리미엄 기능 · Stripe 카드 결제 (${(checkoutMeta.data.premiumUsdCents / 100).toFixed(2)}/월)
              </Text>
              <PayButton
                type="PREMIUM"
                amount={checkoutMeta.data.premiumUsdCents}
                orderName="MoCoMo Premium"
                metadata={{}}
                label="Premium 구독하기"
                onSuccess={() => void refreshMe()}
              />
            </FolkCard>
          ) : null}

          <CreatorCallSettingsCard />

          <MessageComposerSettingsCard />

          <FolkCard>
            <Text style={styles.cardTitle}>게시글 잠금</Text>
            <Text style={styles.cardDesc}>
              팔로워 승인제 등 고급 잠금은 웹 설정에서 관리할 수 있습니다.
            </Text>
            <Pressable
              style={[styles.outlineBtn, { borderColor: colors.brand }]}
              onPress={() => void Linking.openURL("https://mocomo.net/settings")}
            >
              <Text style={[styles.outlineBtnText, { color: colors.brand }]}>
                웹에서 잠금 설정 열기
              </Text>
            </Pressable>
          </FolkCard>

          <FolkCard>
            <Text style={styles.cardTitle}>계정</Text>
            <Text style={styles.metaLine}>
              닉네임: @{user?.username}
              {user?.countryCode ? ` · ${user.countryCode}` : ""}
            </Text>
            <Text style={styles.metaMuted}>표시 이름: {user?.name || "—"}</Text>
            <FolkButton
              label="로그아웃"
              variant="secondary"
              onPress={() => {
                Alert.alert("로그아웃", "이 기기에서 로그아웃할까요?", [
                  { text: "취소", style: "cancel" },
                  { text: "로그아웃", style: "destructive", onPress: () => void signOut() },
                ]);
              }}
            />
          </FolkCard>

          <AccountDeletionCard
            username={user?.username ?? ""}
            hasPassword={Boolean(user?.hasPassword)}
          />

          <FolkCard>
            <Text style={styles.cardTitle}>프로필</Text>
            <Text style={styles.cardDesc}>
              배너·프로필 사진·닉네임·소개·생일 등 전체 프로필을 앱에서 수정합니다. 사이드바
              연필 버튼으로도 열 수 있습니다.
            </Text>
            <FolkButton
              label="프로필 편집"
              onPress={() => navigation.navigate("ProfileEdit" as never)}
            />
            <Pressable
              style={[styles.outlineBtn, { borderColor: colors.brand, marginTop: 8 }]}
              onPress={() => navigation.navigate("Profile" as never)}
            >
              <Text style={[styles.outlineBtnText, { color: colors.brand }]}>내 프로필 보기</Text>
            </Pressable>
          </FolkCard>

          <FolkCard style={{ borderColor: "rgba(196, 92, 62, 0.35)" }}>
            <Text style={[styles.cardTitle, { color: colors.terracotta }]}>Discover</Text>
            <Text style={styles.cardDesc}>관심사 기반 추천을 웹에서 설정하세요.</Text>
            <Pressable
              style={[styles.fillBtn, { backgroundColor: colors.terracotta }]}
              onPress={() => void Linking.openURL("https://mocomo.net/discover")}
            >
              <Text style={styles.fillBtnText}>Discover 열기</Text>
            </Pressable>
          </FolkCard>

          <FolkCard>
            <Text style={styles.cardTitle}>법적 고지</Text>
            {LEGAL_LINKS.map((item) => (
              <Pressable key={item.path} style={styles.linkRow} onPress={() => openLegal(item.path)}>
                <Text style={[styles.linkText, { color: colors.cobalt }]}>{item.label}</Text>
              </Pressable>
            ))}
          </FolkCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Chip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          borderColor: active ? colors.cobalt : "rgba(27, 74, 140, 0.2)",
          backgroundColor: active ? colors.cobalt : colors.muted,
        },
      ]}
    >
      <Text style={{ fontWeight: "700", color: active ? "#fff" : colors.cobalt, fontSize: 13 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return "저장에 실패했습니다.";
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 2,
  },
});

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, gap: spacing.md, paddingBottom: 56 },
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    label: { fontWeight: "800", color: colors.cobalt, marginTop: spacing.sm, marginBottom: 6 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: 4 },
    input: {
      borderWidth: 2,
      borderColor: "rgba(27, 74, 140, 0.22)",
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      paddingVertical: 12,
      backgroundColor: colors.surfaceRaised,
      color: colors.text,
      fontWeight: "600",
    },
    bio: { minHeight: 88, textAlignVertical: "top", marginBottom: 8 },
    metaLine: { fontWeight: "700", color: colors.text, marginBottom: 4 },
    metaMuted: { color: colors.textMuted, marginBottom: 14 },
    outlineBtn: {
      borderWidth: 1.5,
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 8,
    },
    outlineBtnText: { fontWeight: "800", fontSize: 14 },
    fillBtn: {
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    fillBtnText: { color: "#fff", fontWeight: "800" },
    rowGap: { gap: 8, marginTop: 4 },
    linkRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.hairline },
    linkText: { fontWeight: "700", fontSize: 14 },
  });
}
