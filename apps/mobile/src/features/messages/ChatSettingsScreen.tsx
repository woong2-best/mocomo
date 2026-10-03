import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ContactAudienceSettingsCard } from "@/features/settings/ContactAudienceSettingsCard";
import { useI18n } from "@/i18n/I18nProvider";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function ChatSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const { t } = useI18n();

  return (
    <Screen safeTop={false}>
      <AppHeader
        title={t("m.messages.chat_settings")}
        leftLabel={t("common.back")}
        onLeftPress={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ContactAudienceSettingsCard />
      </ScrollView>
    </Screen>
  );
}

function createStyles(_colors: ThemeColors) {
  return StyleSheet.create({
    content: {
      padding: spacing.md,
      gap: spacing.md,
      paddingBottom: spacing.xl,
    },
  });
}
