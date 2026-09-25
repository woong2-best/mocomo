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
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeMobileLocale, type Locale } from "@/i18n";
import { patchMe } from "@/api/discovery";
import { ApiError } from "@/api/client";
import { LocaleRegionCrtCard } from "@/features/settings/LocaleRegionCrtCard";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
import { FeedDisplaySettingsCard } from "@/features/settings/FeedDisplaySettingsCard";
import { PostsLockSettingsCard } from "@/features/settings/PostsLockSettingsCard";
import { AccountDeletionCard } from "@/features/settings/AccountDeletionCard";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { showIslandError, showIslandToast } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user, refreshMe, signOut } = useAuth();
  const { setLocale: applyUiLocale } = useI18n();

  const [locale, setLocale] = useState(user?.locale ?? "ko");
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "KR");
  const [localeBusy, setLocaleBusy] = useState(false);

  useEffect(() => {
    setLocale(user?.locale ?? "ko");
    setCountryCode(user?.countryCode ?? "KR");
  }, [user?.locale, user?.countryCode]);

  async function saveLocale() {
    setLocaleBusy(true);
    try {
      await patchMe({ locale, countryCode, timeZone: detectDeviceTimeZone() });
      await applyUiLocale(normalizeMobileLocale(locale) as Locale);
      await refreshMe();
      showIslandToast("Saved", "지역·언어 설정이 업데이트되었습니다.");
    } catch (e) {
      showIslandError("오류", errorMessage(e));
    } finally {
      setLocaleBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader title="설정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <LocaleRegionCrtCard
            locale={locale}
            countryCode={countryCode}
            onLocaleChange={setLocale}
            onCountryChange={setCountryCode}
            saving={localeBusy}
            onSave={() => void saveLocale()}
          />

          <FeedDisplaySettingsCard />

          <PostsLockSettingsCard />

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

          <FolkButton
            label="약관 및 정책"
            variant="secondary"
            onPress={() => navigation.navigate("LegalPolicies" as never)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function errorMessage(e: unknown) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return "저장에 실패했습니다.";
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, gap: spacing.md, paddingBottom: 56 },
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    metaLine: { fontWeight: "700", color: colors.text, marginBottom: 4 },
    metaMuted: { color: colors.textMuted, marginBottom: 14 },
    fillBtn: {
      borderRadius: radii.md,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 4,
    },
    fillBtnText: { color: "#fff", fontWeight: "800" },
    rowGap: { gap: 8, marginTop: 4 },
  });
}
