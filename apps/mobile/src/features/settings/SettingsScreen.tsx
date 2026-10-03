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
      showIslandToast(t("settings.saved"), t("m.settings.region_and_language_updated"));
    } catch (e) {
      showIslandError(t("m.common.error"), errorMessage(e, t));
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
            <Text style={styles.cardTitle}>{t("m.settings.account")}</Text>
            <Text style={styles.metaLine}>
              {t("m.settings.username")}{user?.username}
              {user?.countryCode ? ` · ${user.countryCode}` : ""}
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

          <FolkCard style={{ borderColor: "rgba(196, 92, 62, 0.35)" }}>
            <Text style={[styles.cardTitle, { color: colors.terracotta }]}>Discover</Text>
            <Text style={styles.cardDesc}>{t("m.settings.set_up_interest_based_recommendations_on")}</Text>
            <Pressable
              style={[styles.fillBtn, { backgroundColor: colors.terracotta }]}
              onPress={() => void Linking.openURL("https://mocomo.net/discover")}
            >
              <Text style={styles.fillBtnText}>{t("m.settings.open_discover")}</Text>
            </Pressable>
          </FolkCard>

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
