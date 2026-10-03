import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "@/config/env";
import { localizedLegalPolicyLinks } from "@/lib/legal-links-i18n";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";
import { useI18n } from "@/i18n/I18nProvider";

export function LegalPoliciesScreen() {
  const { t, locale } = useI18n();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const policyLinks = useMemo(() => localizedLegalPolicyLinks(locale), [locale]);

  const openLegal = (path: string) => {
    const url = `${API_BASE_URL.replace(/\/$/, "")}${path}`;
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <Screen>
      <AppHeader title={t("m.legal.terms_policies")} onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          {t("m.legal.mocomo_terms_of_service_and_community")}
        </Text>
        {policyLinks.map((item) => (
          <Pressable
            key={item.path}
            style={styles.row}
            onPress={() => openLegal(item.path)}
            accessibilityRole="button"
          >
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl,
      gap: spacing.sm,
    },
    lead: {
      color: colors.textMuted,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    rowLabel: {
      flex: 1,
      color: colors.text,
      fontSize: 16,
      fontWeight: "700",
      paddingRight: spacing.sm,
    },
  });
}
