import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/auth/AuthContext";
import { useI18n } from "@/i18n/I18nProvider";
import { isMoneyAgeBlocked, moneyAgeFromUser } from "@/lib/money-age";
import { navigateFromPush } from "@/navigation/navigationRef";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/ThemeContext";
import { spacing } from "@/theme/tokens";

export function MoneyAgeBanner() {
  const { user, status } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  if (status !== "signedIn" || !isMoneyAgeBlocked(user)) return null;
  const moneyAge = moneyAgeFromUser(user);
  const missing = moneyAge?.reason !== "underage";

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: "#f59e0b",
          borderBottomColor: "#b45309",
          paddingTop: Math.max(insets.top, spacing.sm),
        },
      ]}
    >
      <Ionicons name="warning" size={18} color="#431407" style={styles.icon} />
      <View style={styles.copy}>
        <Text style={styles.title}>{t("m.money_age.title")}</Text>
        <Text style={styles.body}>
          {missing ? t("m.money_age.banner_missing") : t("m.money_age.banner_underage")}
        </Text>
        {missing ? (
          <Pressable
            onPress={() => navigateFromPush("ProfileEdit")}
            style={[styles.cta, { backgroundColor: colors.ink }]}
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>{t("m.money_age.add_birth_date")}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  icon: { marginTop: 2 },
  copy: { flex: 1, gap: 4 },
  title: { fontWeight: "800", fontSize: 14, color: "#431407" },
  body: { fontSize: 13, lineHeight: 18, color: "#431407" },
  cta: {
    alignSelf: "flex-start",
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ctaText: { color: "#fff7ed", fontWeight: "700", fontSize: 12 },
});
