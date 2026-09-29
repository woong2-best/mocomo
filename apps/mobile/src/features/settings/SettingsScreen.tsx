import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { normalizeMobileLocale, type Locale } from "@/i18n";
import { localeForCountry } from "@/i18n/locale-from-country";
import { patchMe } from "@/api/discovery";
import { ApiError } from "@/api/client";
import { LocaleRegionCrtCard } from "@/features/settings/LocaleRegionCrtCard";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
import { FeedDisplaySettingsCard } from "@/features/settings/FeedDisplaySettingsCard";
import { PostsLockSettingsCard } from "@/features/settings/PostsLockSettingsCard";
import { WatermarkSettingsCard } from "@/features/settings/WatermarkSettingsCard";
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
  const { setLocale: applyUiLocale, u, t } = useI18n();

  const [locale, setLocale] = useState(
    user?.locale ?? localeForCountry(user?.countryCode ?? "US")
  );
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "US");
  const [localeBusy, setLocaleBusy] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);

  useEffect(() => {
    setLocale(user?.locale ?? localeForCountry(user?.countryCode ?? "US"));
    setCountryCode(user?.countryCode ?? "US");
  }, [user?.locale, user?.countryCode]);

  async function saveLocale() {
    setLocaleBusy(true);
    try {
      await patchMe({ locale, countryCode, timeZone: detectDeviceTimeZone() });
      await applyUiLocale(normalizeMobileLocale(locale) as Locale);
      await refreshMe();
      showIslandToast(t("settings.saved"), u("지역·언어 설정이 업데이트되었습니다.", "Region and language updated."));
    } catch (e) {
      showIslandError(u("오류", "Error"), errorMessage(e, u));
    } finally {
      setLocaleBusy(false);
    }
  }

  return (
    <Screen>
      <AppHeader
        title={t("nav.settings")}
        leftLabel={t("common.back")}
        onLeftPress={() => navigation.goBack()}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <LocaleRegionCrtCard
            locale={locale}
            countryCode={countryCode}
            onLocaleChange={setLocale}
            onCountryChange={(code) => {
              setCountryCode(code);
              setLocale(localeForCountry(code));
            }}
            saving={localeBusy}
            onSave={() => void saveLocale()}
          />

          <FeedDisplaySettingsCard />

          <WatermarkSettingsCard />

          <PostsLockSettingsCard />

          <FolkCard>
            <Text style={styles.cardTitle}>계정</Text>
            <Text style={styles.metaLine}>
              닉네임: @{user?.username}
              {user?.countryCode ? ` · ${user.countryCode}` : ""}
            </Text>
            <Text style={styles.metaMuted}>표시 이름: {user?.name || "—"}</Text>
            {logoutConfirm ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.cardDesc}>이 기기에서 로그아웃할까요?</Text>
                <FolkButton
                  label="로그아웃"
                  variant="secondary"
                  onPress={() => {
                    setLogoutConfirm(false);
                    void signOut();
                  }}
                />
                <FolkButton label="취소" variant="ghost" onPress={() => setLogoutConfirm(false)} />
              </View>
            ) : (
              <FolkButton
                label="로그아웃"
                variant="secondary"
                onPress={() => setLogoutConfirm(true)}
              />
            )}
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

function errorMessage(e: unknown, u: (ko: string, en: string) => string) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return u("저장에 실패했습니다.", "Could not save.");
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
