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
  const { u } = useI18n();

  return (
    <AuthScreenLayout
      title={u("회원가입", "Sign up")}
      subtitle={u("Google 계정으로 MoCoMo에 가입합니다.", "Sign up for MoCoMo with your Google account.")}
    >
      <View style={styles.body}>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          {u(
            "이메일·비밀번호 가입은 지원하지 않습니다. 로그인 화면에서 Google로 계속해 주세요.",
            "Email and password sign-up is not supported. Continue with Google on the sign-in screen."
          )}
        </Text>
        <FolkButton label={u("로그인으로", "Go to sign in")} onPress={() => navigation.replace("Login")} />
        <WelcomeSocialAuthRow
          busyProvider={null}
          onPress={() => navigation.replace("Login")}
          label={u("Google로 가입", "Sign up with Google")}
        />
      </View>
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  hint: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
