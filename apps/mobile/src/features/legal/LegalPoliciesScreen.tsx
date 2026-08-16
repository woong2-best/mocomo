import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "@/config/env";
import { LEGAL_POLICY_LINKS } from "@/lib/legal-links";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { radii, spacing, type ThemeColors } from "@/theme/tokens";

export function LegalPoliciesScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const openLegal = (path: string) => {
    const url = `${API_BASE_URL.replace(/\/$/, "")}${path}`;
    void Linking.openURL(url).catch(() => undefined);
  };

  return (
    <Screen>
      <AppHeader title="약관 및 정책" onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>
          MoCoMo 서비스 이용에 관한 약관과 커뮤니티 운영 정책입니다. 항목을 누르면 웹에서
          전문을 확인할 수 있습니다.
        </Text>
        {LEGAL_POLICY_LINKS.map((item) => (
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
