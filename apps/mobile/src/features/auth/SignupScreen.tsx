import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthScreenLayout } from "@/features/auth/AuthScreenLayout";
import { WelcomeSocialAuthRow } from "@/features/auth/WelcomeSocialAuthRow";
import { FolkButton } from "@/ui/FolkButton";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "@/navigation/types";
import { useI18n } from "@/i18n/I18nProvider";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

/** Public signup is Google-only — send users back to the welcome Google CTA. */
export function SignupScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <AuthScreenLayout
      title={t("m.auth.sign_up")}
      subtitle={t("m.auth.sign_up_for_mocomo_with_your")}
    >
      <View style={styles.body}>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {t("m.auth.email_and_password_sign_up_is")}
        </Text>
        <FolkButton label={t("m.auth.go_to_sign_in")} onPress={() => navigation.replace("Login")} />
        <WelcomeSocialAuthRow
          busyProvider={null}
          onPress={() => navigation.replace("Login")}
          label={t("m.auth.sign_up_with_google")}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  hint: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
