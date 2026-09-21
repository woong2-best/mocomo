import { useMemo } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { CreatorCallSettingsCard } from "@/features/settings/CreatorCallSettingsCard";
import { MessageComposerSettingsCard } from "@/features/settings/MessageComposerSettingsCard";
import { AppHeader } from "@/ui/AppHeader";
import { Screen } from "@/ui/Screen";
import { useTheme } from "@/theme/ThemeContext";
import { spacing, type ThemeColors } from "@/theme/tokens";

export function ChatSettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();

  return (
    <Screen safeTop={false}>
      <AppHeader title="채팅 설정" leftLabel="뒤로" onLeftPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <MessageComposerSettingsCard />
        <CreatorCallSettingsCard />
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
