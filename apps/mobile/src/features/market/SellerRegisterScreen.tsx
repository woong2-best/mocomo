import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "@/auth/AuthContext";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { promptMarketSellerWebFlow } from "@/lib/open-market-seller-web";
import { useI18n } from "@/i18n/I18nProvider";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";
import type { RootStackParamList } from "@/navigation/types";

/** Legacy route — seller onboarding is web-only. Opens the browser on entry. */
export function SellerRegisterScreen() {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { status, openWebAuth } = useAuth();

  useEffect(() => {
    promptMarketSellerWebFlow(navigation, openWebAuth, status === "signedIn");
    const timer = setTimeout(() => {
      if (navigation.canGoBack()) navigation.goBack();
    }, 600);
    return () => clearTimeout(timer);
  }, [navigation, openWebAuth, status]);

  return (
    <Screen>
      <AppHeader title={t("m.market.seller_registration")} leftLabel={t("common.back")} onLeftPress={() => navigation.goBack()} />
      <View style={styles.center}>
        <ActivityIndicator color={colors.terracotta} />
        <Text style={styles.text}>{t("m.market.opening_seller_registration_in_browser")}</Text>
      </View>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      padding: spacing.lg,
    },
    text: { fontSize: 14, color: colors.textMuted, fontWeight: "600", textAlign: "center" },
  });
}
