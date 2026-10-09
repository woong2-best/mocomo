import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
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
import { BlockedUsersCard } from "@/features/settings/BlockedUsersCard";
import { settingCountryLabel } from "@/lib/setting-countries";
import { detectDeviceTimeZone } from "@/lib/device-timezone";
import { FeedDisplaySettingsCard } from "@/features/settings/FeedDisplaySettingsCard";
import { PostsLockSettingsCard } from "@/features/settings/PostsLockSettingsCard";
import { WatermarkSettingsCard } from "@/features/settings/WatermarkSettingsCard";
import { AccountDeletionCard } from "@/features/settings/AccountDeletionCard";
import { AppHeader } from "@/ui/AppHeader";
import { FolkButton } from "@/ui/FolkButton";
import { FolkCard } from "@/ui/FolkCard";
import { Screen } from "@/ui/Screen";
import { showIslandError } from "@/ui/IslandToast";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { TFn } from "@/i18n/types";

export function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createThemedStyles(colors), [colors]);
  const navigation = useNavigation();
  const { user, refreshMe, signOut } = useAuth();
  const { setLocale: applyUiLocale, t } = useI18n();

  const [locale, setLocale] = useState(
    user?.locale ?? localeForCountry(user?.countryCode ?? "US")
  );
  const [countryCode, setCountryCode] = useState(user?.countryCode ?? "US");
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const persistSeq = useRef(0);

  useEffect(() => {
    setLocale(user?.locale ?? localeForCountry(user?.countryCode ?? "US"));
    setCountryCode(user?.countryCode ?? "US");
  }, [user?.locale, user?.countryCode]);

  async function persistLocale(nextLocale: string, nextCountry: string) {
    const seq = ++persistSeq.current;
    try {
      await applyUiLocale(normalizeMobileLocale(nextLocale) as Locale);
      await patchMe({
        locale: nextLocale,
        countryCode: nextCountry,
        timeZone: detectDeviceTimeZone(),
      });
      if (seq === persistSeq.current) await refreshMe();
    } catch (e) {
      if (seq === persistSeq.current) {
        showIslandError(t("m.common.error"), errorMessage(e, t));
      }
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
            onLocaleChange={(code) => {
              setLocale(code);
              void persistLocale(code, countryCode);
            }}
            onCountryChange={(code) => {
              setCountryCode(code);
              const next = localeForCountry(code);
              setLocale(next);
              void persistLocale(next, code);
            }}
          />

          <FeedDisplaySettingsCard />

          <WatermarkSettingsCard />

          <PostsLockSettingsCard />

          <FolkCard>
            <Text style={styles.cardTitle}>{t("m.settings.account")}</Text>
            <Text style={styles.metaLine}>
              {t("m.settings.username")}{user?.username}
              {user?.countryCode ? ` · ${settingCountryLabel(user.countryCode, locale)}` : ""}
            </Text>
            <Text style={styles.metaMuted}>{t("m.settings.display_name")} {user?.name || "—"}</Text>
            {logoutConfirm ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.cardDesc}>{t("m.settings.log_out_on_this_device")}</Text>
                <FolkButton
                  label={t("m.account.log_out")}
                  variant="secondary"
                  onPress={() => {
                    setLogoutConfirm(false);
                    void signOut();
                  }}
                />
                <FolkButton label={t("toast.cancel")} variant="ghost" onPress={() => setLogoutConfirm(false)} />
              </View>
            ) : (
              <FolkButton
                label={t("m.account.log_out")}
                variant="secondary"
                onPress={() => setLogoutConfirm(true)}
              />
            )}
          </FolkCard>

          <AccountDeletionCard
            username={user?.username ?? ""}
            hasPassword={Boolean(user?.hasPassword)}
          />

          <BlockedUsersCard />

          <FolkButton
            label={t("m.settings.terms_and_policies")}
            variant="secondary"
            onPress={() => navigation.navigate("LegalPolicies" as never)}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function errorMessage(e: unknown, t: TFn) {
  if (e instanceof ApiError && e.body && typeof e.body === "object" && "error" in e.body) {
    return String((e.body as { error: string }).error);
  }
  return t("m.common.could_not_save");
}

function createThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    body: { padding: spacing.md, gap: spacing.md, paddingBottom: 56 },
    cardTitle: { fontSize: 17, fontWeight: "800", color: colors.brand, marginBottom: 4 },
    cardDesc: { color: colors.textMuted, fontSize: 13, marginBottom: 12, lineHeight: 18 },
    metaLine: { fontWeight: "700", color: colors.text, marginBottom: 4 },
    metaMuted: { color: colors.textMuted, marginBottom: 14 },
  });
}
